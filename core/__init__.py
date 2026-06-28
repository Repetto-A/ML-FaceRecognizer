"""
core — Motor de reconocimiento facial compartido (local GPU + VPS CPU).

Expone:
    FaceMatcher  — detección (MTCNN) + embeddings (InceptionResnetV1) + búsqueda vectorizada.
    FaceMatch    — resultado de un match.
    IndexStore   — índice de embeddings en memoria con persistencia .npz + .json.
"""

from .matcher import FaceMatcher, FaceMatch
from .index_store import IndexStore, IndexRecord

__all__ = ["FaceMatcher", "FaceMatch", "IndexStore", "IndexRecord"]
