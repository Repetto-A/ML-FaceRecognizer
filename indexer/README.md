# indexer/ — Indexado batch en GPU local

Herramienta CLI que convierte un **registro de personas** (carpeta de fotos + CSV) en un
**artefacto de índice de embeddings** y lo sincroniza al VPS.

El cómputo pesado (MTCNN + InceptionResnetV1) corre en la **GPU local (RTX 5060)**; el VPS
sólo carga el índice y compara vectores. Ver `docs/ARCHITECTURE.md` y `docs/specs/02-indexer-gpu.md`.

> **Importante:** ejecutá siempre desde la **raíz del proyecto** (no desde `indexer/`),
> así `from core import ...` resuelve correctamente.

## Requisitos

- venv local con `torch` **cu128** (RTX 5060 = Blackwell `sm_120`). Ya instalado en `.venv`.
- `tqdm` para la barra de progreso (opcional; degrada elegante si falta).

## Formato del registro

```
registry/
├── people.csv          # columnas: name, photo, status?, contact?, location?, notes?
└── photos/
    ├── juan_perez_1.jpg
    └── ...
```

- **Columnas obligatorias:** `name`, `photo`.
- **Opcionales:** `status` (default `buscado`), `contact`, `location`, `notes`.
- `photo` se resuelve, en orden: ruta directa → `registry/photos/<photo>` → `registry/<photo>`.
- Varias filas con el mismo `name` = varias fotos de la misma persona (mejora el recall).

Ver un ejemplo completo en `indexer/registry.example/`.

## Salida

```
index/
├── embeddings.npz   # matriz float32 (N, 512) L2-normalizada, key="emb"
├── index.json       # metadata alineada por fila
└── skipped.csv      # (sólo si hubo fotos sin cara / faltantes) name, photo, reason
```

## Uso

```bash
# 1. Construir el índice (GPU)
python -m indexer build --registry ./registry --out ./index --batch-size 32

# Si no hay GPU y querés probar igual (LENTO, sólo testing):
python -m indexer build --registry ./registry --out ./index --allow-cpu

# 2. Ver estadísticas del índice
python -m indexer stats --index ./index

# 3. Subir el índice al VPS por scp (Fase 1)
python -m indexer push --index ./index --target vps

# (Fase 3, todavía no implementado)
python -m indexer push --index ./index --target supabase
```

### `push --target vps`

Sube `embeddings.npz` + `index.json` por `scp`. Toma la configuración de variables de
entorno (ver `.env.example`), con estos defaults:

| Variable         | Default                          |
|------------------|----------------------------------|
| `VPS_HOST`       | `ubuntu@149.56.129.7`            |
| `VPS_INDEX_PATH` | `/home/ubuntu/face-api/index`    |
| `SSH_KEY`        | `C:\Users\conta\.ssh\droplet`    |

Crea el directorio remoto (`ssh mkdir -p`) e imprime cada comando antes de ejecutarlo.
Requiere el cliente OpenSSH (`ssh`/`scp`) en el PATH.

## Resumen de `build`

Al terminar imprime: filas en CSV, indexadas, saltadas, tiempo, throughput (fotos/s) y el
nombre de la GPU (`torch.cuda.get_device_name(0)`). Las fotos sin cara o faltantes se
reportan en `skipped.csv` **sin abortar** el run.

## Códigos de salida

| Código | Significado                                            |
|--------|--------------------------------------------------------|
| 0      | OK                                                     |
| 2      | Error de entrada (CSV/registro/índice inválido)        |
| 3      | CUDA no disponible y falta `--allow-cpu`               |
| 4      | Falta el binario `ssh`/`scp`                           |
