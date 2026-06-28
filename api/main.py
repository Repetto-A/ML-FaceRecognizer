"""
Servicio FastAPI de búsqueda facial — ML-FaceRecognizer (specs 03/05).

Se ejecuta desde la raíz del proyecto (para que `from core import ...` resuelva):
    uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 1

Endurecimiento incluido: API key, CORS restringido, validación de uploads (magic bytes
+ límite de tamaño + streaming), lock + escritura atómica de la DB, rate limiting.
"""

from __future__ import annotations

import asyncio
import logging
import threading
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from core import FaceMatcher, IndexStore, IndexRecord
from core.index_store import SearchHit

from .config import settings
from .schemas import (
    DeleteResponse,
    HealthResponse,
    MatchResult,
    PersonSummary,
    RegisterResponse,
    ReloadResponse,
    SearchResponse,
)
from .security import ensure_api_key_configured, masked_key, require_api_key
from .uploads import delete_quietly, save_upload

logger = logging.getLogger("face-api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

# Lock global para serializar escrituras (register/delete/reload) sobre el índice.
_write_lock = threading.Lock()

# Rate limiter (slowapi) por IP de origen.
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Carga el modelo y el índice una sola vez al arrancar."""
    ensure_api_key_configured()
    logger.info("Inicializando FaceMatcher (device=%s)…", settings.TORCH_DEVICE)
    app.state.matcher = FaceMatcher(device=settings.TORCH_DEVICE)
    logger.info("Cargando índice desde %s…", settings.INDEX_DIR)
    app.state.store = IndexStore.load(settings.INDEX_DIR)
    logger.info("Índice cargado: %s registros.", app.state.store.size())
    yield
    logger.info("Apagando servicio face-api.")


app = FastAPI(
    title="ML-FaceRecognizer — API de búsqueda",
    description="Servicio de búsqueda de personas por similitud facial (VPS, CPU).",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiting wiring.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS restringido (nunca "*").
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["x-api-key", "Content-Type"],
)


# ── Helpers ─────────────────────────────────────────────────
def _get_matcher(request: Request) -> FaceMatcher:
    return request.app.state.matcher


def _get_store(request: Request) -> IndexStore:
    return request.app.state.store


def _hit_to_match(hit: SearchHit) -> MatchResult:
    md = hit.record.metadata or {}
    return MatchResult(
        person_id=hit.record.id,
        name=hit.record.name,
        similarity=round(hit.similarity, 4),
        distance=round(hit.distance, 4),
        image_path=hit.record.image_path,
        contact=md.get("contact"),
        location=md.get("location"),
    )


def _record_to_summary(rec: IndexRecord) -> PersonSummary:
    md = rec.metadata or {}
    return PersonSummary(
        person_id=rec.id,
        name=rec.name,
        status=rec.status,
        image_path=rec.image_path,
        contact=md.get("contact"),
        location=md.get("location"),
    )


# ── Endpoints ───────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    """Estado del servicio (sin autenticación)."""
    store: IndexStore = _get_store(request)
    return HealthResponse(
        status="ok",
        device=settings.TORCH_DEVICE,
        index_size=store.size(),
        counts=store.counts(),
    )


@app.post("/search", response_model=SearchResponse)
@limiter.limit(settings.SEARCH_RATE_LIMIT)
async def search(
    request: Request,
    photo: UploadFile = File(...),
    threshold: float = Form(default=settings.DEFAULT_THRESHOLD),
    top_k: int = Form(default=5),
    _key: str = Depends(require_api_key),
) -> SearchResponse:
    """Foto de una persona encontrada → top-K posibles coincidencias en el registro."""
    if not (1 <= top_k <= 20):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="top_k debe estar entre 1 y 20.",
        )
    if not (0.0 <= threshold <= 1.0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="threshold debe estar entre 0.0 y 1.0.",
        )

    path = await save_upload(photo, settings.max_upload_bytes, settings.UPLOAD_DIR)
    try:
        matcher: FaceMatcher = _get_matcher(request)
        embedding = await asyncio.to_thread(matcher.extract_embedding, str(path))
    finally:
        # La foto de query no se conserva (minimización de datos, spec 05).
        delete_quietly(path)

    if embedding is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se detectó ninguna cara en la imagen.",
        )

    store: IndexStore = _get_store(request)
    hits: List[SearchHit] = store.search(
        embedding, top_k=top_k, threshold=threshold, status="buscado"
    )
    return SearchResponse(
        query_id=uuid.uuid4().hex[:8],
        matches=[_hit_to_match(h) for h in hits],
        disclaimer="Posibles coincidencias. Requiere verificación humana.",
    )


@app.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit(settings.REGISTER_RATE_LIMIT)
async def register(
    request: Request,
    name: str = Form(...),
    photo: UploadFile = File(...),
    status_value: str = Form(default="buscado", alias="status"),
    contact: Optional[str] = Form(default=None),
    location: Optional[str] = Form(default=None),
    key: str = Depends(require_api_key),
) -> RegisterResponse:
    """Alta individual online de una persona (el bulk va por el `indexer/`)."""
    path = await save_upload(photo, settings.max_upload_bytes, settings.UPLOAD_DIR)

    matcher: FaceMatcher = _get_matcher(request)
    embedding = await asyncio.to_thread(matcher.extract_embedding, str(path))
    if embedding is None:
        delete_quietly(path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se detectó ninguna cara en la imagen.",
        )

    metadata = {}
    if contact:
        metadata["contact"] = contact
    if location:
        metadata["location"] = location

    store: IndexStore = _get_store(request)

    def _do_register() -> IndexRecord:
        with _write_lock:
            rec = store.add(
                embedding,
                name=name,
                status=status_value,
                image_path=str(path),
                metadata=metadata,
            )
            store.save(settings.INDEX_DIR)
            return rec

    rec = await asyncio.to_thread(_do_register)
    logger.info(
        "REGISTER id=%s name=%s status=%s key=%s ts=%s",
        rec.id, rec.name, rec.status, key, datetime.now(timezone.utc).isoformat(),
    )
    return RegisterResponse(
        person_id=rec.id, name=rec.name, status=rec.status, message="Registro creado."
    )


@app.get("/people", response_model=List[PersonSummary])
async def people(
    request: Request,
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    _key: str = Depends(require_api_key),
) -> List[PersonSummary]:
    """Lista registros del índice (paginado simple). Filtro opcional por `status`."""
    if limit < 1 or limit > 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="limit debe estar entre 1 y 200.",
        )
    if offset < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="offset no puede ser negativo.",
        )

    store: IndexStore = _get_store(request)
    records = store.records
    if status_filter is not None:
        records = [r for r in records if r.status == status_filter]
    page = records[offset : offset + limit]
    return [_record_to_summary(r) for r in page]


@app.delete("/people/{person_id}", response_model=DeleteResponse)
async def delete_person(
    request: Request,
    person_id: str,
    key: str = Depends(require_api_key),
) -> DeleteResponse:
    """Baja auditada de un registro."""
    store: IndexStore = _get_store(request)

    def _do_delete() -> bool:
        with _write_lock:
            ok = store.remove(person_id)
            if ok:
                store.save(settings.INDEX_DIR)
            return ok

    deleted = await asyncio.to_thread(_do_delete)
    logger.info(
        "DELETE id=%s deleted=%s key=%s ts=%s",
        person_id, deleted, key, datetime.now(timezone.utc).isoformat(),
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No existe un registro con id '{person_id}'.",
        )
    return DeleteResponse(
        person_id=person_id, deleted=True, message="Registro eliminado."
    )


@app.post("/index/reload", response_model=ReloadResponse)
async def index_reload(
    request: Request,
    key: str = Depends(require_api_key),
) -> ReloadResponse:
    """Recarga el índice desde disco (tras un `indexer push`)."""

    def _do_reload() -> IndexStore:
        with _write_lock:
            new_store = IndexStore.load(settings.INDEX_DIR)
            request.app.state.store = new_store
            return new_store

    store = await asyncio.to_thread(_do_reload)
    logger.info(
        "INDEX_RELOAD size=%s key=%s ts=%s",
        store.size(), key, datetime.now(timezone.utc).isoformat(),
    )
    return ReloadResponse(
        status="ok",
        index_size=store.size(),
        counts=store.counts(),
        message="Índice recargado desde disco.",
    )
