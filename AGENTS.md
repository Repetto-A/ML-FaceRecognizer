# AGENTS.md

## Cursor Cloud specific instructions

Proyecto **Somos Huella** (`ML-FaceRecognizer`): reconocimiento facial para reencuentro
de personas. Devuelve *posibles coincidencias* ordenadas por similitud (la confirmación
es humana). Componentes y comandos estándar están documentados en `README.md`,
`api/README.md`, `indexer/README.md` y `frontend/README.md`; abajo solo van las notas
no obvias del entorno cloud.

### Servicios

| Servicio | Carpeta | Cómo correr (dev) | Notas |
|----------|---------|-------------------|-------|
| Motor compartido | `core/` | `.venv/bin/python -m tests.smoke_core` | Lib usada por API e indexer; el smoke test valida el pipeline completo. |
| API de búsqueda | `api/` | `uvicorn api.main:app --reload --port 8000` (desde la **raíz**) | FastAPI, CPU. |
| Indexer (batch) | `indexer/` | `python -m indexer build ... --allow-cpu` (desde la **raíz**) | Genera `index/`. En esta VM **no hay GPU**: usar `--allow-cpu`. |
| Frontend | `frontend/` | `npm run dev` (http://localhost:3000) | Next.js; proxya a la API. |

### Entorno Python

- El Python del sistema es PEP 668 (externally-managed). Hay que usar el **venv en `.venv`**
  (`.venv/bin/python`, `.venv/bin/uvicorn`). Requiere el paquete de sistema `python3.12-venv`
  (ya presente en el snapshot).
- **Conflicto torch/facenet:** `facenet-pytorch` fija `torch<2.3`, pero el repo usa torch ≥2.7.
  Por eso hay que instalar `facenet-pytorch` con `--no-deps` (como ya hace el update script).
  Si reinstalás manualmente, hacelo igual o el resolver de pip falla con `ResolutionImpossible`.
- La **primera** carga de `FaceMatcher` descarga los pesos VGGFace2/MTCNN (~110 MB) a
  `~/.cache/torch` (quedan cacheados; el snapshot ya los tiene).

### Arranque de la API (gotchas)

- Se ejecuta **desde la raíz del proyecto** (no desde `api/`), para que `from core import …` resuelva.
- **No arranca sin `API_KEY`.** Lee un `.env` en la raíz (gitignored). Copiá `.env.example` → `.env`
  (clave de dev cualquiera). Arranque con las vars cargadas:
  `set -a; source .env; set +a; .venv/bin/python -m uvicorn api.main:app --port 8000`.

### Índice de búsqueda

- `/search` solo devuelve resultados si existe un índice en `INDEX_DIR` (`./index`). El índice
  **no** está commiteado. Para poblarlo con datos demo:
  `.venv/bin/python scripts/download_demo_faces.py` y luego
  `.venv/bin/python -m indexer build --registry ./indexer/demo --out ./index --allow-cpu`.
- Tras regenerar el índice en disco, la API lo recarga con `POST /index/reload` (o reiniciándola).

### Frontend (gotchas)

- El proxy server-side lee `frontend/.env.local` (gitignored) con `API_URL` y `API_KEY`
  (privadas, **no** `NEXT_PUBLIC_*`). Sin ese archivo, `/api/search` devuelve 500
  "El servidor no está configurado". Crear: `API_URL=http://localhost:8000` / `API_KEY=<la del .env raíz>`.
- **`npm run lint` es interactivo**: no hay config de ESLint commiteada, así que `next lint`
  abre un prompt y se queda colgado. Para chequeo no interactivo usar `npm run build`
  (corre lint + tipos) o `npm run typecheck`.
- La cámara (`getUserMedia`) solo funciona en `localhost`/HTTPS; en otros orígenes la UI cae
  al modo "subir archivo".

### Bug conocido del frontend (preexistente, no de entorno)

En `/buscar`, al pulsar «Buscar coincidencias» el backend responde 200 con la coincidencia
correcta (verificable por `curl` o en Network), pero la UI **resetea los resultados a vacío
de inmediato** y nunca llega a mostrarlos. Causa: en `components/SearchCapture.tsx` se pasa
`handlePhotoChange` (no memoizada) como `onChange` a `PhotoCapture`; su `commitFile`
(useCallback que depende de `onChange`) cambia en cada render, por lo que el
`useEffect(..., [presetFile, commitFile])` de `PhotoCapture` se re-ejecuta tras cada render,
llama `onChange(photo)` y, cuando el estado es `done`, dispara `setState({idle})`, borrando
los resultados. Para verificar la funcionalidad de búsqueda mientras tanto, usar el endpoint
de la API o el proxy `/api/search` directamente. Fix sugerido (fuera del setup): memoizar
`handlePhotoChange` con `useCallback` y/o no resetear el estado en ese efecto.
