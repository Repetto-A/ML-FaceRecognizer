"""
Modelos de respuesta (pydantic) del servicio `api/` — spec 03.

El lenguaje es deliberadamente prudente: el sistema sugiere "posibles coincidencias",
nunca afirma identidad. La verificación humana es obligatoria.
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class MatchResult(BaseModel):
    """Una posible coincidencia devuelta por `/search`."""

    person_id: str = Field(..., description="ID del registro en el índice")
    name: str
    similarity: float = Field(..., description="Similitud coseno 0..1 (mayor = más parecido)")
    distance: float = Field(..., description="Distancia coseno 0..2 (1 - similarity)")
    image_path: str = ""
    contact: Optional[str] = None
    location: Optional[str] = None


class SearchResponse(BaseModel):
    """Respuesta de `/search`: top-K matches + disclaimer."""

    query_id: str
    matches: List[MatchResult]
    disclaimer: str = "Posibles coincidencias. Requiere verificación humana."


class RegisterResponse(BaseModel):
    """Respuesta de `/register`: confirma el alta individual."""

    person_id: str
    name: str
    status: str
    message: str = "Registro creado."


class PersonSummary(BaseModel):
    """Resumen de un registro para el listado `/people`."""

    person_id: str
    name: str
    status: str
    image_path: str = ""
    contact: Optional[str] = None
    location: Optional[str] = None


class HealthResponse(BaseModel):
    """Respuesta de `/health` (sin auth)."""

    status: str = "ok"
    device: str
    index_size: int
    counts: dict


class DeleteResponse(BaseModel):
    """Respuesta de `DELETE /people/{id}`."""

    person_id: str
    deleted: bool
    message: str


class ReloadResponse(BaseModel):
    """Respuesta de `POST /index/reload`."""

    status: str = "ok"
    index_size: int
    counts: dict
    message: str = "Índice recargado desde disco."
