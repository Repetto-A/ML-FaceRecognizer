"""
Índice de embeddings — ML-FaceRecognizer (specs 02/03).

Mantiene en memoria una matriz (N, 512) de embeddings L2-normalizados y una lista de
registros (metadata) alineada por fila. Persiste como artefacto portable:

    index/
    ├── embeddings.npz   # np.savez_compressed(emb=matrix float32)
    └── index.json       # [{id, name, status, image_path, metadata}, ...]

Lo genera el `indexer/` (GPU local) y lo consume la `api/` (VPS CPU). Pensado para
migrar a Supabase pgvector (HNSW) cuando escale, manteniendo la misma interfaz lógica.
"""

from __future__ import annotations

import os
import json
import uuid
import numpy as np
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any

from .matcher import FaceMatcher, FaceMatch, EMBEDDING_DIM

EMB_FILE = "embeddings.npz"
META_FILE = "index.json"


@dataclass
class IndexRecord:
    """Metadata de una persona registrada (alineada por fila con la matriz)."""
    id: str
    name: str
    status: str = "buscado"          # "buscado" | "encontrado"
    image_path: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SearchHit:
    """Resultado de búsqueda: match + registro asociado."""
    record: IndexRecord
    similarity: float
    distance: float


class IndexStore:
    """
    Índice de embeddings en memoria con persistencia .npz + .json.

    Invariante: `self.matrix` es (N, 512) float32 L2-normalizado y `self.records`
    tiene longitud N, alineado por índice de fila.
    """

    def __init__(self):
        self.matrix: Optional[np.ndarray] = None      # (N, 512) o None si vacío
        self.records: List[IndexRecord] = []

    # ── Tamaño / estado ─────────────────────────────────────
    def __len__(self) -> int:
        return len(self.records)

    def size(self) -> int:
        return len(self.records)

    def counts(self) -> Dict[str, int]:
        c = {"total": len(self.records), "buscado": 0, "encontrado": 0}
        for r in self.records:
            c[r.status] = c.get(r.status, 0) + 1
        return c

    # ── Alta ────────────────────────────────────────────────
    def add(
        self,
        embedding: np.ndarray,
        name: str,
        status: str = "buscado",
        image_path: str = "",
        metadata: Optional[Dict[str, Any]] = None,
        record_id: Optional[str] = None,
    ) -> IndexRecord:
        """Agrega un embedding (512,) + metadata. Devuelve el IndexRecord creado."""
        emb = np.asarray(embedding, dtype=np.float32).reshape(-1)
        if emb.shape[0] != EMBEDDING_DIM:
            raise ValueError(f"Embedding debe ser ({EMBEDDING_DIM},), recibido {emb.shape}")
        emb = emb / (np.linalg.norm(emb) + 1e-8)      # garantizar normalización

        rec = IndexRecord(
            id=record_id or uuid.uuid4().hex[:8],
            name=name,
            status=status,
            image_path=image_path,
            metadata=metadata or {},
        )
        self.records.append(rec)
        row = emb.reshape(1, -1)
        self.matrix = row if self.matrix is None else np.vstack([self.matrix, row])
        return rec

    def remove(self, record_id: str) -> bool:
        """Elimina un registro por id. Devuelve True si existía."""
        for i, r in enumerate(self.records):
            if r.id == record_id:
                del self.records[i]
                if self.matrix is not None:
                    self.matrix = np.delete(self.matrix, i, axis=0)
                    if len(self.matrix) == 0:
                        self.matrix = None
                return True
        return False

    # ── Búsqueda ────────────────────────────────────────────
    def search(
        self,
        query: np.ndarray,
        top_k: int = 5,
        threshold: float = 0.65,
        status: Optional[str] = None,
    ) -> List[SearchHit]:
        """
        Busca coincidencias para un embedding query.

        Args:
            status: si se indica ("buscado"/"encontrado"), filtra el índice antes de buscar.
        """
        if self.matrix is None or len(self.records) == 0:
            return []

        if status is None:
            sub_matrix = self.matrix
            sub_records = self.records
        else:
            mask = [i for i, r in enumerate(self.records) if r.status == status]
            if not mask:
                return []
            sub_matrix = self.matrix[mask]
            sub_records = [self.records[i] for i in mask]

        matches: List[FaceMatch] = FaceMatcher.cosine_search(
            np.asarray(query, dtype=np.float32).reshape(-1),
            sub_matrix,
            top_k=top_k,
            threshold=threshold,
        )
        return [
            SearchHit(record=sub_records[m.index], similarity=m.similarity, distance=m.distance)
            for m in matches
        ]

    # ── Persistencia ────────────────────────────────────────
    def save(self, index_dir: str | os.PathLike) -> None:
        """Persiste matriz + metadata de forma atómica (tmp + replace)."""
        d = Path(index_dir)
        d.mkdir(parents=True, exist_ok=True)

        matrix = self.matrix if self.matrix is not None else np.zeros((0, EMBEDDING_DIM), np.float32)

        # .npz atómico. Escribimos a un tmp que YA termina en .npz (np.savez no le
        # agrega otro sufijo) y luego os.replace al destino final.
        tmp_npz = d / (EMB_FILE + ".tmp.npz")
        np.savez_compressed(tmp_npz, emb=matrix.astype(np.float32))
        os.replace(tmp_npz, d / EMB_FILE)

        # index.json atómico
        meta = [asdict(r) for r in self.records]
        tmp_json = d / (META_FILE + ".tmp")
        with open(tmp_json, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)
        os.replace(tmp_json, d / META_FILE)

    @classmethod
    def load(cls, index_dir: str | os.PathLike) -> "IndexStore":
        """Carga un índice desde disco. Si no existe, devuelve un índice vacío."""
        store = cls()
        d = Path(index_dir)
        emb_path, meta_path = d / EMB_FILE, d / META_FILE
        if not emb_path.exists() or not meta_path.exists():
            return store

        with np.load(emb_path) as npz:
            matrix = npz["emb"].astype(np.float32)
        with open(meta_path, encoding="utf-8") as f:
            meta = json.load(f)

        if len(matrix) != len(meta):
            raise ValueError(
                f"Índice corrupto: {len(matrix)} embeddings vs {len(meta)} registros."
            )

        store.matrix = matrix if len(matrix) > 0 else None
        store.records = [
            IndexRecord(
                id=r.get("id") or uuid.uuid4().hex[:8],
                name=r.get("name", ""),
                status=r.get("status", "buscado"),
                image_path=r.get("image_path", ""),
                metadata=r.get("metadata", {}),
            )
            for r in meta
        ]
        return store
