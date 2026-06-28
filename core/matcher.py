"""
Motor de matching facial — ML-FaceRecognizer (spec 01).

Pipeline:
  1. Detectar y alinear cara (MTCNN → 160x160).
  2. Extraer embedding facial (InceptionResnetV1, pre-entrenado VGGFace2 → 512 dims).
  3. Comparar embeddings por similitud coseno (vectorizada con numpy).

Los embeddings se devuelven SIEMPRE L2-normalizados, de modo que la similitud coseno
es un simple producto punto (`a @ b`) y la búsqueda en una matriz es un único matmul
(`matrix @ query`).

Device-agnóstico: usa CUDA si está disponible (indexer en GPU local) o CPU (API en VPS).
"""

from __future__ import annotations

import cv2
import torch
import numpy as np
from PIL import Image
from typing import Optional, Tuple, List, Sequence, Union
from dataclasses import dataclass
from facenet_pytorch import MTCNN, InceptionResnetV1

ImageInput = Union[str, Image.Image, np.ndarray]

EMBEDDING_DIM = 512
DEFAULT_THRESHOLD = 0.65


@dataclass
class FaceMatch:
    """Resultado de un match entre una query y un registro del índice."""
    index: int          # posición en la matriz/índice
    similarity: float   # 0..1 — cosine similarity (mayor = más parecido)
    distance: float     # 0..2 — cosine distance (1 - similarity)


class FaceMatcher:
    """
    Motor de matching facial.

    Uso (indexer, GPU):
        m = FaceMatcher(device="cuda")
        embs = m.extract_batch(list_of_paths)          # batched en GPU

    Uso (api, CPU):
        m = FaceMatcher()                               # autodetecta cpu/cuda
        q = m.extract_embedding("encontrado.jpg")       # 1 cara
        hits = FaceMatcher.cosine_search(q, matrix, top_k=5, threshold=0.65)
    """

    def __init__(self, device: Optional[str] = None):
        self.device = torch.device(
            device or ("cuda" if torch.cuda.is_available() else "cpu")
        )

        # MTCNN: detecta la cara principal, la recorta y alinea a 160x160.
        self.detector = MTCNN(
            image_size=160,
            margin=20,
            min_face_size=40,
            thresholds=[0.6, 0.7, 0.7],
            factor=0.709,
            keep_all=False,          # solo la cara más grande/principal
            device=self.device,
        )

        # InceptionResnetV1: extractor de embeddings (VGGFace2 → 512 dims).
        self.encoder = InceptionResnetV1(
            pretrained="vggface2",
            classify=False,
        ).eval().to(self.device)

    # ── Helpers de carga ────────────────────────────────────
    @staticmethod
    def _to_pil(image: ImageInput) -> Image.Image:
        """Normaliza cualquier input soportado a PIL RGB."""
        if isinstance(image, Image.Image):
            return image.convert("RGB")
        if isinstance(image, str):
            return Image.open(image).convert("RGB")
        if isinstance(image, np.ndarray):
            # numpy asumido BGR (OpenCV) si tiene 3 canales
            if image.ndim == 3 and image.shape[-1] == 3:
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            return Image.fromarray(image).convert("RGB")
        raise TypeError(f"Tipo de imagen no soportado: {type(image)}")

    @staticmethod
    def _l2_normalize(v: np.ndarray) -> np.ndarray:
        return v / (np.linalg.norm(v, axis=-1, keepdims=True) + 1e-8)

    # ── Extracción ──────────────────────────────────────────
    def extract_embedding(self, image: ImageInput) -> Optional[np.ndarray]:
        """
        Extrae el embedding facial de UNA imagen.

        Returns:
            Vector numpy (512,) L2-normalizado, o None si no se detectó cara.
        """
        pil = self._to_pil(image)
        face = self.detector(pil)
        if face is None:
            return None
        with torch.no_grad():
            emb = self.encoder(face.unsqueeze(0).to(self.device))
        vec = emb.cpu().numpy().flatten()
        return self._l2_normalize(vec).astype(np.float32)

    def extract_batch(
        self,
        images: Sequence[ImageInput],
        batch_size: int = 32,
    ) -> List[Optional[np.ndarray]]:
        """
        Extrae embeddings de N imágenes aprovechando la GPU.

        La detección (MTCNN) se hace por imagen (robusto a fotos sin cara); la
        codificación (encoder) se hace en lotes de `batch_size` para throughput.

        Returns:
            Lista de N elementos: vector (512,) L2-normalizado, o None donde no hubo cara.
        """
        results: List[Optional[np.ndarray]] = [None] * len(images)

        faces: List[Optional[torch.Tensor]] = []
        for img in images:
            try:
                faces.append(self.detector(self._to_pil(img)))
            except Exception:
                faces.append(None)

        valid_idx = [i for i, f in enumerate(faces) if f is not None]
        if not valid_idx:
            return results

        for start in range(0, len(valid_idx), batch_size):
            chunk_idx = valid_idx[start:start + batch_size]
            batch = torch.stack([faces[i] for i in chunk_idx]).to(self.device)
            with torch.no_grad():
                out = self.encoder(batch).cpu().numpy()
            out = self._l2_normalize(out).astype(np.float32)
            for j, i in enumerate(chunk_idx):
                results[i] = out[j]

        return results

    # ── Búsqueda ────────────────────────────────────────────
    @staticmethod
    def cosine_search(
        query: np.ndarray,
        matrix: np.ndarray,
        top_k: int = 5,
        threshold: float = DEFAULT_THRESHOLD,
    ) -> List[FaceMatch]:
        """
        Busca los vecinos más cercanos por similitud coseno.

        Asume `query` (512,) y `matrix` (N, 512) **ya L2-normalizados** (los embeddings
        generados por esta clase lo están). La similitud es entonces `matrix @ query`.

        Returns:
            Lista de FaceMatch ordenada por similitud descendente, filtrada por threshold.
        """
        if matrix is None or len(matrix) == 0:
            return []
        sims = matrix @ query                      # (N,)
        order = np.argsort(-sims)                   # descendente
        out: List[FaceMatch] = []
        for idx in order[: max(top_k, 0)]:
            sim = float(sims[idx])
            if sim < threshold:
                break
            out.append(FaceMatch(index=int(idx), similarity=sim, distance=1.0 - sim))
        return out

    def compare_two_faces(
        self, image_a: ImageInput, image_b: ImageInput, threshold: float = DEFAULT_THRESHOLD
    ) -> Tuple[bool, float]:
        """Compara dos imágenes. Returns (is_match, similarity). Helper de QA/debug."""
        a = self.extract_embedding(image_a)
        b = self.extract_embedding(image_b)
        if a is None or b is None:
            return False, 0.0
        sim = float(np.dot(a, b))
        return sim >= threshold, sim
