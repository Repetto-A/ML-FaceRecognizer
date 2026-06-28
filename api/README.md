# `api/` — Servicio de búsqueda facial (VPS, CPU)

Refactor endurecido del `api.py` original (specs `03-search-api-vps.md` y
`05-deploy-security.md`). Carga el índice generado por el `indexer/`, embebe la foto de
query en CPU y devuelve **posibles coincidencias** (verificación humana obligatoria).

> **Importante:** se ejecuta **desde la raíz del proyecto** para que `from core import ...`
> resuelva. El módulo es `api.main:app`.

## Variables de entorno

Se leen del entorno o de un archivo `.env` en la raíz (fuera de git). Ver `.env.example`.

| Variable | Default | Descripción |
|----------|---------|-------------|
| `API_KEY` | *(vacío)* | **Obligatoria.** Si falta, el servicio **no arranca**. Header `x-api-key`. |
| `ALLOWED_ORIGINS` | *(vacío)* | CSV de orígenes CORS permitidos (ej. `https://app.com,https://www.app.com`). Nunca `*`. |
| `MAX_UPLOAD_MB` | `10` | Límite de tamaño de upload (se corta el stream antes de cargarlo a memoria). |
| `INDEX_DIR` | `./index` | Carpeta del índice (`embeddings.npz` + `index.json`). |
| `DEFAULT_THRESHOLD` | `0.65` | Umbral de similitud coseno por defecto. |
| `TORCH_DEVICE` | `cpu` | Device de PyTorch (`cpu` en el VPS). |
| `UPLOAD_DIR` | `./uploads` | Carpeta temporal de uploads. |
| `SEARCH_RATE_LIMIT` | `30/minute` | Rate limit de `/search` (slowapi). |
| `REGISTER_RATE_LIMIT` | `10/minute` | Rate limit de `/register` (slowapi). |

Ejemplo `.env`:

```env
API_KEY=cambiame-por-una-clave-larga-y-aleatoria
ALLOWED_ORIGINS=https://somoshuella.org,https://www.somoshuella.org
MAX_UPLOAD_MB=10
INDEX_DIR=./index
DEFAULT_THRESHOLD=0.65
TORCH_DEVICE=cpu
UPLOAD_DIR=./uploads
```

## Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | no | Estado, device, tamaño y counts del índice |
| POST | `/search` | API key + rate limit | Foto encontrada → top-K posibles coincidencias |
| POST | `/register` | API key + rate limit | Alta individual online |
| GET | `/people` | API key | Lista registros (paginado `limit`/`offset`, filtro `status_filter`) |
| DELETE | `/people/{id}` | API key | Baja auditada (404 si no existía) |
| POST | `/index/reload` | API key | Recarga el índice desde disco tras un push |

## Correr en local (desarrollo)

Desde la **raíz del proyecto** (con el venv activado e instaladas las deps de
`requirements-cpu.txt`):

```powershell
# Windows PowerShell
$env:API_KEY="dev-key-123"
$env:ALLOWED_ORIGINS="http://localhost:3000"
.\.venv\Scripts\python.exe -m uvicorn api.main:app --reload --port 8000
```

```bash
# Linux / macOS
export API_KEY=dev-key-123
export ALLOWED_ORIGINS=http://localhost:3000
uvicorn api.main:app --reload --port 8000
```

Docs interactivas: <http://localhost:8000/docs>

## Correr en el VPS (producción)

1 worker (el modelo es pesado en RAM; escalar con réplicas si hace falta):

```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 1
```

Detrás de Nginx + TLS (Let's Encrypt). Ver `face-api.service` para systemd y la
spec `05-deploy-security.md` para el reverse proxy.

## Ejemplos `curl`

```bash
# Health (sin auth)
curl http://localhost:8000/health

# Búsqueda
curl -X POST http://localhost:8000/search \
  -H "x-api-key: dev-key-123" \
  -F "photo=@encontrado.jpg" \
  -F "threshold=0.65" \
  -F "top_k=5"

# Alta individual
curl -X POST http://localhost:8000/register \
  -H "x-api-key: dev-key-123" \
  -F "name=Carlos M." \
  -F "photo=@registro.jpg" \
  -F "status=buscado" \
  -F "contact=+54 9 11 5555-5555" \
  -F "location=Rosario, Santa Fe"

# Listado (paginado + filtro)
curl "http://localhost:8000/people?status_filter=buscado&limit=20&offset=0" \
  -H "x-api-key: dev-key-123"

# Baja
curl -X DELETE http://localhost:8000/people/ab12cd34 \
  -H "x-api-key: dev-key-123"

# Recarga del índice (tras indexer push)
curl -X POST http://localhost:8000/index/reload \
  -H "x-api-key: dev-key-123"
```

## Notas de seguridad

- API key en todos los endpoints salvo `/health` (comparación con `secrets.compare_digest`).
- CORS restringido a `ALLOWED_ORIGINS` (nunca `*`).
- Uploads validados por **magic bytes** (JPEG/PNG/WEBP), no por extensión, con límite de
  tamaño aplicado durante el streaming a disco.
- Escrituras serializadas con `threading.Lock`; persistencia atómica (`tmp` + `os.replace`)
  vía `IndexStore.save`.
- `register` y `delete` quedan auditados en el log (timestamp + fragmento de la key).
- La foto de query **no se conserva** (minimización de datos).
