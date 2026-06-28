"""
Autenticación por API key (header `x-api-key`) — spec 03/05.

- Todos los endpoints salvo `/health` dependen de `require_api_key`.
- Comparación en tiempo constante con `secrets.compare_digest`.
- Si `API_KEY` no está configurada, el servicio falla al boot (no arranca inseguro).
"""

from __future__ import annotations

import secrets

from fastapi import Header, HTTPException, status

from .config import settings

API_KEY_HEADER = "x-api-key"


def ensure_api_key_configured() -> None:
    """Aborta el arranque si no hay API key. Se llama en el lifespan de la app."""
    if not settings.API_KEY:
        raise RuntimeError(
            "API_KEY no está configurada. Definí API_KEY en el entorno o en .env "
            "antes de arrancar el servicio (el API no debe correr sin autenticación)."
        )


async def require_api_key(x_api_key: str | None = Header(default=None)) -> str:
    """
    Dependencia FastAPI: valida el header `x-api-key`.

    Devuelve un fragmento parcial de la key (para auditoría/logging); lanza 401 si
    falta o es incorrecta.
    """
    if not settings.API_KEY:
        # Defensa en profundidad: nunca autorizar si no hay key configurada.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Servicio mal configurado: falta API_KEY.",
        )

    if not x_api_key or not secrets.compare_digest(x_api_key, settings.API_KEY):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key inválida o ausente.",
            headers={"WWW-Authenticate": API_KEY_HEADER},
        )

    return masked_key(x_api_key)


def masked_key(key: str) -> str:
    """Fragmento de la key apto para logs de auditoría (nunca la key completa)."""
    if len(key) <= 4:
        return "****"
    return f"{key[:4]}…{key[-2:]}"
