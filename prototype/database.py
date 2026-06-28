"""
Embedding Database — Reencuentros Venezuela 2026

Gestión de embeddings faciales: guardar, buscar, persistir.
Diseñado para migrar a Supabase pgvector cuando el backend esté listo.

Estructura de un registro:
    {
        "id": "uuid",
        "name": "Juan Pérez",
        "status": "buscado" | "encontrado",
        "embedding": np.ndarray (512,),
        "image_path": "path/to/photo.jpg",
        "metadata": {
            "age": 35,
            "last_seen_location": "La Guaira",
            "contact_phone": "+584241234567",
            "reported_by": "María Pérez (hermana)"
        }
    }
"""

import json
import uuid
import numpy as np
from pathlib import Path
from typing import Optional, List, Dict, Any


class EmbeddingDB:
    """
    Base de datos de embeddings en memoria con persistencia JSON.

    En producción, migrar a Supabase con pgvector para búsqueda eficiente
    a escala (índices IVFFlat/HNSW sobre vectores de 512 dims).
    """

    def __init__(self, storage_path: Optional[str] = None):
        self._records: List[Dict[str, Any]] = []
        self._storage_path = Path(storage_path) if storage_path else None
        if self._storage_path and self._storage_path.exists():
            self._load()

    def add_person(
        self,
        name: str,
        embedding: np.ndarray,
        image_path: str,
        status: str = "buscado",
        metadata: Optional[Dict] = None,
    ) -> str:
        """
        Registra una persona en la base de datos.

        Args:
            name: Nombre de la persona.
            embedding: Vector de features de 512 dimensiones.
            image_path: Ruta de la foto de referencia.
            status: 'buscado' (familia busca) o 'encontrado' (rescatista reporta).
            metadata: Info adicional (edad, ubicación, contacto).

        Returns:
            ID único asignado.
        """
        record_id = str(uuid.uuid4())[:8]
        record = {
            "id": record_id,
            "name": name,
            "status": status,
            "embedding": embedding.astype(np.float32),
            "image_path": image_path,
            "metadata": metadata or {},
        }
        self._records.append(record)
        self._save()
        return record_id

    def add_multiple_photos(
        self,
        name: str,
        embeddings: List[np.ndarray],
        image_paths: List[str],
        status: str = "buscado",
        metadata: Optional[Dict] = None,
    ) -> List[str]:
        """
        Registra múltiples fotos de la misma persona.
        Cada foto genera un embedding independiente, aumentando
        la probabilidad de match desde distintos ángulos/iluminación.
        """
        ids = []
        for emb, path in zip(embeddings, image_paths):
            rid = self.add_person(name, emb, path, status, metadata)
            ids.append(rid)
        return ids

    def get_all_searched(self) -> List[Dict]:
        """Devuelve todas las personas en estado 'buscado'."""
        return [r for r in self._records if r["status"] == "buscado"]

    def get_all_found(self) -> List[Dict]:
        """Devuelve todas las personas en estado 'encontrado'."""
        return [r for r in self._records if r["status"] == "encontrado"]

    def get_all(self) -> List[Dict]:
        """Devuelve todos los registros."""
        return self._records

    def size(self) -> int:
        return len(self._records)

    def _save(self):
        """Persiste a JSON (embeddings como listas)."""
        if not self._storage_path:
            return
        data = []
        for r in self._records:
            record_copy = dict(r)
            record_copy["embedding"] = r["embedding"].tolist()
            data.append(record_copy)
        self._storage_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self._storage_path, "w") as f:
            json.dump(data, f, indent=2)

    def _load(self):
        """Carga desde JSON."""
        with open(self._storage_path) as f:
            data = json.load(f)
        for r in data:
            r["embedding"] = np.array(r["embedding"], dtype=np.float32)
        self._records = data
