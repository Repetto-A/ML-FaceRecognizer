# Arquitectura — ML-FaceRecognizer

## 1. Principio rector

> **El cómputo pesado va donde está la GPU. El VPS sólo hace lo barato.**

Generar un embedding facial (MTCNN + InceptionResnetV1) es caro en CPU
(~200–600 ms/foto) y trivial en GPU (~5–15 ms/foto). Comparar vectores (similitud
coseno) es barato en cualquier lado.

Por eso partimos el sistema monolítico original (`reencuentros-ai`, que hacía todo en
el VPS sin GPU) en dos planos:

| Plano | Hardware | Hace |
|-------|----------|------|
| **Indexado** | Local — RTX 5060 (GPU) | Batch de fotos del registro → embeddings → sube vectores |
| **Búsqueda** | VPS OVH (CPU) | Guarda vectores, embebe 1 query por vez, compara y rankea |

## 2. ¿Por qué el VPS igual necesita el modelo?

Una búsqueda parte de una **foto nueva** (la persona encontrada). Esa foto hay que
convertirla a embedding antes de comparar. No se puede evitar correr el modelo para la
query. Pero es **una sola cara por request**, lo que en CPU es tolerable (~0.5 s).

- **Bulk (cientos/miles de fotos del registro):** GPU local. Es el trabajo que el plan
  original llamaba "entrenar" (en realidad es *indexar*: no se entrena nada, el modelo
  ya viene pre-entrenado en VGGFace2).
- **Single query online:** CPU del VPS. Aceptable y mantiene la PC local fuera del
  camino crítico.

> Optimización futura: si el volumen de queries crece, exponer un endpoint de embedding
> en la PC local (GPU) y que el VPS lo llame. Por ahora, innecesario.

## 3. Diagrama de flujo

```
REGISTRO (familia)                          BÚSQUEDA (rescatista)
─────────────────                           ─────────────────────
fotos + metadata                            foto de encontrado
      │                                            │
      ▼                                            ▼
[indexer/ — GPU local]                      [frontend Next.js]
  MTCNN + ResNet (batch)                          │ POST /search (multipart)
  → matriz de embeddings (N×512)                  ▼
      │                                     [api/ — VPS CPU]
      │ sync (npz / push API / pgvector)      MTCNN + ResNet (1 cara, CPU)
      ▼                                       → query embedding (512,)
[VPS: índice de vectores] ◄───────────────────────┤
                                              cosine vs índice (matmul vectorizado)
                                              → top-K matches ≥ threshold
                                                    │
                                                    ▼
                                            "posibles coincidencias" + verificación humana
```

## 4. Componentes

### `core/` — motor compartido (local + VPS)
Refactor de `matcher.py`. Device-agnóstico (`cuda` si hay, si no `cpu`).
Expone: `extract_embedding(img) -> np.ndarray(512)`, `extract_batch(imgs)`,
`cosine_search(query, matrix) -> top_k`. La búsqueda se **vectoriza con numpy**
(`matrix @ query`) en vez del loop actual record-por-record.

### `indexer/` — indexado batch (local, GPU)
CLI que toma una carpeta de fotos + un CSV/JSON de metadata, genera embeddings en GPU
por lotes, y produce un **artefacto de índice** (`index.npz` = matriz float32 + sidecar
JSON con metadata). Luego lo sincroniza al VPS (3 opciones, ver §5).

### `api/` — servicio de búsqueda (VPS, CPU)
Refactor de `api.py` endurecido:
- `POST /search` — embebe query (CPU) + matching vectorizado.
- `POST /register` — alta individual online (opcional; el bulk va por indexer).
- `GET /people`, `GET /health`, `DELETE /people/{id}` (con auth).
- Endurecimiento: **auth por API key**, **CORS restringido**, **validación de uploads**
  (content-type real por magic bytes + límite de tamaño + streaming a disco), **lock +
  escritura atómica** de la DB.

### `frontend/` — Next.js (fase 3)
Reutiliza el patrón de Shippear (`lib/api.ts` + panel de upload con drag-drop/preview).
Pantallas: registro y búsqueda con captura de cámara (`getUserMedia`). Lenguaje de UI:
"posible coincidencia — verificar", nunca afirmación de identidad.

## 5. Sincronización local → VPS (decisión por fases)

| Fase | Mecanismo | Cuándo |
|------|-----------|--------|
| **F1 (MVP)** | `scp index.npz` al VPS; la API lo carga al arrancar/recargar | Ahora. Simple, sin infra extra. |
| **F2** | Endpoint `POST /index/push` (auth) que recibe vectores y los mergea | Cuando haya altas frecuentes |
| **F3** | **Supabase pgvector** (HNSW). El indexer hace `upsert`; la API hace `SELECT ... ORDER BY embedding <=> query` | Cuando supere ~10k registros o se necesite multiusuario |

## 6. Stack y pinning de PyTorch

| Entorno | Python | PyTorch | Índice de wheels |
|---------|--------|---------|------------------|
| Local (GPU) | 3.12 | `torch` + `torchvision` **cu128** | `https://download.pytorch.org/whl/cu128` |
| VPS (CPU) | 3.12 | `torch` + `torchvision` **cpu** | `https://download.pytorch.org/whl/cpu` |

Motivo: la **RTX 5060 es Blackwell (`sm_120`)** y sólo tiene kernels en builds CUDA 12.8+.
Python 3.14 (instalado por defecto en la máquina) **no tiene wheels de PyTorch** todavía →
usamos 3.12.

## 7. Decisiones registradas (ADR breves)

1. **Indexar en GPU local, buscar en VPS** — aprovecha hardware existente; evita pagar GPU cloud.
2. **Mantener el modelo en el VPS sólo para queries** — inevitable embeber la foto de búsqueda; 1/req en CPU es tolerable.
3. **Índice `.npz` antes que pgvector** — para <10k registros, matmul en numpy es suficiente y sin infra. pgvector cuando escale.
4. **HNSW > IVFFlat** cuando migremos a pgvector — más robusto a bajo volumen, sin tuning de `lists`.
5. **Datos sensibles fuera de git** — fotos, teléfonos y `embeddings.json` en `.gitignore`. Privacidad por diseño.
6. **Verificación humana obligatoria** — el sistema sugiere, no decide.
