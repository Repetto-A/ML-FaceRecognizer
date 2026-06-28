"""
FastAPI — Reencuentros Venezuela 2026
=====================================
API REST para el pipeline de matching facial.

Endpoints:
  POST /register   — Familia registra persona buscada (nombre + foto)
  POST /search     — Rescatista busca coincidencias (foto → top-N matches)
  GET  /people     — Lista de personas registradas
  GET  /health     — Estado del servicio

Uso:
  uvicorn api:app --reload --host 0.0.0.0 --port 8000
"""

import uuid
import asyncio
from pathlib import Path
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import numpy as np

from matcher import FaceMatcher
from database import EmbeddingDB

# ── Config ──────────────────────────────────────────────────
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "embeddings.json"

# ── Estado global ───────────────────────────────────────────
matcher: FaceMatcher | None = None
db: EmbeddingDB | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa modelos al arrancar, limpia al apagar."""
    global matcher, db
    print("[startup] Cargando FaceMatcher (MTCNN + InceptionResnetV1)...")
    matcher = FaceMatcher()
    print(f"[startup] Dispositivo: {matcher.device}")
    db = EmbeddingDB(storage_path=str(DB_PATH))
    print(f"[startup] DB cargada: {db.size()} registros")
    print("[startup] ✓ API lista")
    yield
    print("[shutdown] Guardando DB...")
    if db:
        db._save()
    print("[shutdown] ✓")


app = FastAPI(
    title="Reencuentros Venezuela — Face Matching API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, restringir al dominio del frontend
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Modelos de respuesta ────────────────────────────────────
class MatchResult(BaseModel):
    person_id: str
    name: str
    similarity: float
    distance: float


class SearchResponse(BaseModel):
    query_id: str
    matches: List[MatchResult]


class RegisterResponse(BaseModel):
    person_id: str
    name: str
    message: str


class PersonSummary(BaseModel):
    id: str
    name: str
    status: str
    image_path: str


# ── Helpers ─────────────────────────────────────────────────
async def run_in_thread(func, *args):
    """Ejecuta operaciones CPU-bound del matcher en un thread pool."""
    return await asyncio.to_thread(func, *args)


def save_upload(file: UploadFile) -> Path:
    """Guarda un archivo subido y retorna la ruta."""
    ext = Path(file.filename).suffix or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    path = UPLOAD_DIR / filename
    path.write_bytes(file.file.read())
    return path


# ── Endpoints ───────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "device": str(matcher.device),
        "people_registered": db.size(),
        "searched": len(db.get_all_searched()),
        "found": len(db.get_all_found()),
    }


@app.get("/people", response_model=List[PersonSummary])
async def list_people(status: Optional[str] = None):
    """Lista personas registradas. Filtro opcional: ?status=buscado|encontrado"""
    records = db.get_all()
    if status:
        records = [r for r in records if r["status"] == status]
    return [
        PersonSummary(
            id=r["id"],
            name=r["name"],
            status=r["status"],
            image_path=r["image_path"],
        )
        for r in records
    ]


@app.post("/register", response_model=RegisterResponse)
async def register_person(
    name: str = Form(..., description="Nombre de la persona buscada"),
    photo: UploadFile = File(..., description="Foto de referencia"),
    status: str = Form("buscado", description="buscado | encontrado"),
    contact: Optional[str] = Form(None, description="Teléfono/email de contacto"),
    location: Optional[str] = Form(None, description="Última ubicación conocida"),
):
    """
    Una familia o rescatista registra una persona.

    - **name**: Nombre completo.
    - **photo**: Imagen (JPEG/PNG). Debe contener UNA cara clara.
    - **status**: 'buscado' (familia busca) o 'encontrado' (rescatista reporta).
    - **contact**: Info de contacto (opcional).
    - **location**: Ubicación donde fue vista por última vez.
    """
    # Guardar imagen
    image_path = save_upload(photo)

    # Extraer embedding
    embedding = await run_in_thread(matcher.extract_embedding, str(image_path))

    if embedding is None:
        image_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail="No se detectó ninguna cara en la imagen. Asegurate de que sea una foto frontal clara.",
        )

    # Guardar en DB
    metadata = {}
    if contact:
        metadata["contact"] = contact
    if location:
        metadata["location"] = location

    person_id = db.add_person(
        name=name,
        embedding=embedding,
        image_path=str(image_path),
        status=status,
        metadata=metadata,
    )

    return RegisterResponse(
        person_id=person_id,
        name=name,
        message=f"Persona registrada como '{status}'. Embedding de {len(embedding)} dimensiones extraído.",
    )


@app.post("/search", response_model=SearchResponse)
async def search_match(
    photo: UploadFile = File(..., description="Foto de la persona encontrada"),
    threshold: float = Form(0.65, description="Umbral de similitud (0-1). Más alto = más estricto."),
    top_k: int = Form(5, description="Máximo de resultados", ge=1, le=20),
):
    """
    Un rescatista o voluntario sube una foto para buscar coincidencias.

    Compara contra TODAS las personas registradas como 'buscado'.
    Devuelve los matches ordenados por similitud descendente.

    - **photo**: Imagen de la persona encontrada.
    - **threshold**: 0.65 = balanceado, 0.80 = alta confianza, 0.50 = permisivo.
    - **top_k**: Cuántos resultados devolver (máx 20).
    """
    # Guardar imagen
    image_path = save_upload(photo)

    # Extraer embedding
    query_emb = await run_in_thread(matcher.extract_embedding, str(image_path))

    if query_emb is None:
        image_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail="No se detectó ninguna cara en la imagen. Intentá con otra foto.",
        )

    # Buscar matches entre los 'buscado'
    searched = db.get_all_searched()
    if not searched:
        return SearchResponse(
            query_id=image_path.stem,
            matches=[],
        )

    matches = await run_in_thread(
        matcher.find_matches,
        query_emb,
        searched,
        threshold,
        top_k,
    )

    return SearchResponse(
        query_id=image_path.stem,
        matches=[
            MatchResult(
                person_id=m.person_id,
                name=m.name,
                similarity=round(m.similarity, 4),
                distance=round(m.distance, 4),
            )
            for m in matches
        ],
    )


@app.post("/search-all")
async def search_all(
    photo: UploadFile = File(...),
    threshold: float = Form(0.65),
    top_k: int = Form(5, ge=1, le=20),
):
    """
    Búsqueda contra TODOS los registros (buscados + encontrados).
    Útil para detectar duplicados entre múltiples reportes de la misma persona.
    """
    image_path = save_upload(photo)
    query_emb = await run_in_thread(matcher.extract_embedding, str(image_path))

    if query_emb is None:
        image_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Cara no detectada.")

    all_records = db.get_all()
    matches = await run_in_thread(matcher.find_matches, query_emb, all_records, threshold, top_k)

    return SearchResponse(
        query_id=image_path.stem,
        matches=[
            MatchResult(
                person_id=m.person_id,
                name=m.name,
                similarity=round(m.similarity, 4),
                distance=round(m.distance, 4),
            )
            for m in matches
        ],
    )


@app.delete("/people/{person_id}")
async def delete_person(person_id: str):
    """Elimina un registro por ID."""
    global db
    initial = db.size()
    db._records = [r for r in db._records if r["id"] != person_id]
    db._save()
    if db.size() == initial:
        raise HTTPException(status_code=404, detail="Persona no encontrada.")
    return {"deleted": person_id}


# ── Entrypoint ──────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
