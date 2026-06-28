# Spec 01 — `core/` Motor de matching compartido

## Objetivo
Refactorizar `matcher.py` en un módulo reutilizable por `indexer/` (GPU) y `api/` (CPU),
con búsqueda **vectorizada** y soporte batch.

## Origen
`matcher.py` actual (monolito). Problemas a resolver:
- `find_matches` itera record por record en Python (O(n) lento). → vectorizar con numpy.
- No hay extracción batch (clave para el indexer en GPU).
- `cosine_similarity` re-normaliza en cada llamada. → pre-normalizar y usar matmul.

## API pública

```python
class FaceMatcher:
    def __init__(self, device: str | None = None): ...
    # device=None → autodetecta "cuda" si disponible, si no "cpu"

    def extract_embedding(self, image) -> np.ndarray | None:
        """1 imagen (path|PIL|ndarray) → vector (512,) L2-normalizado, o None si no hay cara."""

    def extract_batch(self, images: list, batch_size: int = 32) -> list[np.ndarray | None]:
        """N imágenes → N embeddings (None donde no detectó cara). Usa GPU batched."""

    @staticmethod
    def cosine_search(query: np.ndarray, matrix: np.ndarray, top_k: int, threshold: float)
        -> list[tuple[int, float]]:
        """query (512,) vs matrix (N,512) ya normalizada → [(idx, sim), ...] top_k ≥ threshold.
        Implementado como `sims = matrix @ query` (un solo matmul)."""
```

## Requisitos
1. **Embeddings L2-normalizados** al generarse → la similitud coseno es un dot product directo.
2. `extract_batch` debe aprovechar GPU: apilar tensores y pasar por el encoder en lotes
   de `batch_size`. MTCNN puede recibir lista de imágenes (`keep_all=False`).
3. Device-agnóstico: el mismo `core/` corre en GPU (indexer) y CPU (api).
4. Determinismo: `model.eval()` + `torch.no_grad()` (ya está).
5. Sin estado global: la clase se instancia una vez y se inyecta.

## Criterios de aceptación
- [ ] `extract_embedding` devuelve vector unitario (`‖v‖ ≈ 1.0`).
- [ ] `cosine_search` da el mismo ranking que el loop original pero en 1 matmul.
- [ ] `extract_batch` procesa 100 fotos en GPU en < 5 s (5060).
- [ ] Tests con 2 fotos de la misma persona → sim > 0.7; distintas → sim < 0.5.

## Notas
`compare_two_faces` se mantiene como helper de debug/QA.
Umbral por defecto: 0.65 (balanceado) — configurable por request.
