# prototype/ — Monolito original (`reencuentros-ai`)

Código original traído del VPS OVH. Hacía **todo en el VPS sin GPU** (un solo proceso:
extracción de embeddings + matching + persistencia JSON).

Se conserva como **referencia y base del refactor**. La arquitectura objetivo (GPU local
para indexar + VPS sólo para buscar) está en [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
y las specs en [`../docs/specs/`](../docs/specs/).

| Archivo | Se convierte en |
|---------|-----------------|
| `matcher.py` | `core/` (spec 01) — + batch GPU + búsqueda vectorizada |
| `database.py` | índice `.npz` + (fase 3) pgvector (spec 02/03) |
| `api.py` | `api/` (spec 03) — endurecido (auth, validación, locking) |
| `demo.py` | tests/QA de `core/` |
| `PLAN.md` | plan v1 original (superado por `docs/`) |

No usar en producción: CORS `*`, sin auth, uploads sin validar, DB con race conditions.
