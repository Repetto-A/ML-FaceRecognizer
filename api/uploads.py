"""
Validación y guardado de uploads — spec 03/05.

Reglas de endurecimiento:
- Tipo real por **magic bytes** (no por extensión): sólo JPEG / PNG / WEBP.
- Límite de tamaño (`MAX_UPLOAD_MB`) chequeado **mientras se hace streaming a disco**,
  abortando con 413 antes de cargar el archivo entero en memoria.
- Se guarda en `UPLOAD_DIR` con nombre UUID. Si luego no se detecta cara, el llamador
  debe borrarlo con `delete_quietly`.
"""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

# Tamaño de chunk para el streaming a disco (64 KiB).
_CHUNK = 64 * 1024
# Bytes necesarios para identificar todos los formatos soportados (WEBP usa 12).
_MAGIC_PREFIX = 12


def _sniff_image_type(head: bytes) -> str | None:
    """
    Identifica el formato real por magic bytes. Devuelve la extensión (".jpg"/".png"/
    ".webp") o None si no es un formato de imagen soportado.
    """
    if head[:3] == b"\xff\xd8\xff":
        return ".jpg"
    if head[:8] == b"\x89PNG\r\n\x1a\n":  # 89504e470d0a1a0a
        return ".png"
    if len(head) >= 12 and head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return ".webp"
    return None


async def save_upload(upload: UploadFile, max_bytes: int, upload_dir: str) -> Path:
    """
    Valida y persiste un `UploadFile` a `upload_dir`.

    Returns:
        Path del archivo guardado (nombre UUID + extensión según tipo real).

    Raises:
        HTTPException 400 si no es una imagen JPEG/PNG/WEBP.
        HTTPException 413 si supera `max_bytes`.
    """
    dest_dir = Path(upload_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)

    # 1) Leer el encabezado para identificar el tipo real antes de escribir nada.
    head = await upload.read(_MAGIC_PREFIX)
    ext = _sniff_image_type(head)
    if ext is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo no es una imagen válida (sólo JPEG, PNG o WEBP).",
        )

    # 2) Streaming a disco controlando el tamaño acumulado.
    dest = dest_dir / f"{uuid.uuid4().hex}{ext}"
    total = len(head)
    try:
        with open(dest, "wb") as out:
            out.write(head)
            while True:
                chunk = await upload.read(_CHUNK)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    out.close()
                    delete_quietly(dest)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=(
                            f"El archivo supera el límite de "
                            f"{max_bytes // (1024 * 1024)} MB."
                        ),
                    )
                out.write(chunk)
    except HTTPException:
        raise
    except Exception:
        delete_quietly(dest)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo procesar el archivo subido.",
        )
    finally:
        await upload.close()

    return dest


def delete_quietly(path: Path | str) -> None:
    """Borra un archivo ignorando errores (cleanup tras query sin cara, errores, etc.)."""
    try:
        Path(path).unlink(missing_ok=True)
    except OSError:
        pass
