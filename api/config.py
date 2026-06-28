"""
Configuración del servicio `api/` — leída de variables de entorno / `.env`.

Usa pydantic-settings (`BaseSettings`). Todas las claves se pueden sobreescribir por
entorno; en el VPS, los secretos viven en un `.env` fuera de git (ver spec 05).
"""

from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Settings del servicio. Ver `.env.example` para la lista completa."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Seguridad ──────────────────────────────────────────
    API_KEY: str = ""
    # CSV en entorno (ej. "https://app.com,https://www.app.com"). Tipo str para evitar
    # que pydantic-settings intente parsear el env como JSON (falla con CSV simple).
    ALLOWED_ORIGINS: str = ""

    # ── Uploads ────────────────────────────────────────────
    MAX_UPLOAD_MB: int = 10
    UPLOAD_DIR: str = "./uploads"

    # ── Índice / matching ──────────────────────────────────
    INDEX_DIR: str = "./index"
    DEFAULT_THRESHOLD: float = 0.65
    TORCH_DEVICE: str = "cpu"

    # ── Rate limiting (slowapi) ────────────────────────────
    SEARCH_RATE_LIMIT: str = "30/minute"
    REGISTER_RATE_LIMIT: str = "10/minute"

    @property
    def allowed_origins_list(self) -> List[str]:
        if not self.ALLOWED_ORIGINS:
            return []
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_MB * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    """Devuelve un singleton cacheado de Settings."""
    return Settings()


settings = get_settings()
