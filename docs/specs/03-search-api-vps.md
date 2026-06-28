# Spec 03 — `api/` Servicio de búsqueda (VPS, CPU)

## Objetivo
Refactor endurecido de `api.py`. Corre en el VPS (CPU), carga el índice generado por el
`indexer/`, embebe la query y devuelve matches. Listo para producción mínima.

## Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | no | Estado, device, tamaño del índice |
| POST | `/search` | API key | Foto encontrada → top-K posibles coincidencias |
| POST | `/register` | API key | Alta individual online (bulk va por indexer) |
| GET | `/people` | API key | Lista registros (paginado) |
| DELETE | `/people/{id}` | API key | Baja (auditada) |
| POST | `/index/reload` | API key | Recarga `index.npz` desde disco (tras un push) |

## Carga del índice
- Al arrancar (`lifespan`): carga `index/embeddings.npz` (matriz N×512) + `index.json`.
- Mantiene la matriz en memoria para matmul.
- `/index/reload` permite refrescar sin reiniciar el proceso tras un `indexer push`.

## Endurecimiento (resuelve hallazgos del análisis del VPS)

### Seguridad
- **API key** obligatoria (header `x-api-key`) en todos los endpoints salvo `/health`.
- **CORS restringido** al dominio del frontend (env `ALLOWED_ORIGINS`), no `*`.
- `DELETE` y `register` auditados (log con timestamp + key parcial).
- Rate limiting básico (slowapi) en `/search` y `/register`.

### Validación de uploads
- Content-type real por **magic bytes** (no por extensión): sólo JPEG/PNG/WEBP.
- Límite de tamaño (`MAX_UPLOAD_MB`, default 10) **antes** de leer a memoria.
- Streaming a disco en `uploads/` con nombre UUID; borrar si no hay cara.

### Integridad de datos
- **Lock** (`threading.Lock`/`filelock`) en escrituras de la DB.
- **Escritura atómica**: escribir a `tmp` + `os.replace` (evita corrupción del JSON).
- Evitar el patrón O(n²) actual (reescribir todo el JSON en cada alta): append/merge.

## Performance
- Matching vectorizado: `sims = matrix @ query` (numpy), no loop Python.
- Query embedding en CPU vía `asyncio.to_thread` (no bloquear el event loop). Ya existe `run_in_thread`.
- 1 worker uvicorn (modelo pesado en RAM); escalar con réplicas si hace falta.

## Respuesta `/search`
```json
{
  "query_id": "ab12cd34",
  "matches": [
    {"person_id": "x1", "name": "Carlos M.", "similarity": 0.87, "distance": 0.13,
     "image_path": "...", "contact": "...", "location": "..."}
  ],
  "disclaimer": "Posibles coincidencias. Requiere verificación humana."
}
```

## Config (env)
`API_KEY`, `ALLOWED_ORIGINS`, `MAX_UPLOAD_MB`, `INDEX_DIR`, `DEFAULT_THRESHOLD=0.65`,
`TORCH_DEVICE=cpu`.

## Criterios de aceptación
- [ ] Sin API key → 401 en endpoints protegidos.
- [ ] Upload no-imagen o > límite → 400/413 sin tocar el modelo.
- [ ] `/search` responde < 1.5 s en CPU con índice de 1000.
- [ ] Escrituras concurrentes no corrompen la DB (test de carga).
- [ ] `/index/reload` refleja un índice recién pusheado.

## Reuso
Plantilla FastAPI (health/ready, settings por env, schemas, Dockerfile) tomada de
Shippear `VirgIA/.../capsule_qc_mvp/src/capsule_qc/api/` y `upload.middleware.ts`.
