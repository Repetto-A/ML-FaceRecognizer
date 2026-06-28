# Spec 02 — `indexer/` Indexado batch en GPU local

## Objetivo
Herramienta CLI que corre en la **RTX 5060** para convertir el registro de personas
"buscadas" (carpeta de fotos + metadata) en un **índice de embeddings** y subirlo al VPS.

## Entrada
```
registry/
├── people.csv          # id_externo, name, contact, location, status, photo
├── photos/
│   ├── juan_perez_1.jpg
│   ├── juan_perez_2.jpg   # varias fotos por persona = más recall
│   └── ...
```
`people.csv` columnas mínimas: `name, photo, status` (+ `contact`, `location`, `notes` opcionales).
Varias filas con el mismo `name` = múltiples fotos de la misma persona.

## Salida — artefacto de índice
```
index/
├── embeddings.npz      # array float32 (N, 512) L2-normalizado, key="emb"
└── index.json          # metadata alineada por fila: [{id, name, status, image_path, metadata}, ...]
```
`.npz` para que la API lo cargue como una matriz y haga matmul directo.

## CLI
```bash
python -m indexer build  --registry ./registry --out ./index --batch-size 32
python -m indexer push   --index ./index --target vps      # scp (F1)
python -m indexer push   --index ./index --target supabase # upsert (F3)
python -m indexer stats  --index ./index
```

## Comportamiento
1. Lee `people.csv`, resuelve rutas de fotos.
2. `core.FaceMatcher(device="cuda")` → `extract_batch` por lotes.
3. Fotos sin cara detectada → se reportan en un `skipped.csv`, no rompen el run.
4. Escribe `.npz` + `.json` alineados por índice de fila.
5. `push`: sube el artefacto (F1 = `scp` al VPS a `~/face-api/index/`).

## Requisitos
- Validar que `torch.cuda.is_available()` y avisar si cae a CPU (sería lento).
- Barra de progreso (`tqdm`) y resumen: total, indexadas, saltadas, tiempo, throughput.
- Idempotente: re-ejecutar regenera el índice completo (F1). Merge incremental en F2/F3.
- Logguear el `device` y `torch.cuda.get_device_name(0)`.

## Criterios de aceptación
- [ ] Indexa 500 fotos en GPU en < 30 s.
- [ ] `.npz` + `.json` tienen N filas alineadas.
- [ ] `push --target vps` deja el índice disponible para la API.
- [ ] Fotos corruptas/sin cara se saltan con reporte, sin abortar.

## Reuso
Patrón de carga de modelo/inferencia/PIL tomado de
`AI-ML Brain Tumor Classifier/web/AI Model/export_model.py`.
