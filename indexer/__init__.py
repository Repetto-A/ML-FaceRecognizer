"""
indexer — Indexado batch de embeddings faciales en GPU local (ML-FaceRecognizer, spec 02).

CLI que toma un registro de personas (CSV + carpeta de fotos), genera embeddings en la
GPU local por lotes con `core.FaceMatcher`, construye un `core.IndexStore` y lo guarda
como artefacto portable (`embeddings.npz` + `index.json`). Luego puede sincronizarlo al
VPS (scp, F1) o a Supabase pgvector (F3, pendiente).

Uso (desde la raíz del proyecto):
    python -m indexer build --registry ./registry --out ./index --batch-size 32
    python -m indexer push  --index ./index --target vps
    python -m indexer stats --index ./index
"""

from .cli import main, build_parser

__all__ = ["main", "build_parser"]
