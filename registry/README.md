# Registro de personas — `registry/`

Colocá aquí las fotos de personas **buscadas** (desaparecidas) y el CSV de metadata.
El **indexer** (en tu PC con GPU) genera embeddings y los sube al VPS.

> ⚠️ **No commitear fotos reales** — esta carpeta está en `.gitignore`.

## Estructura

```
registry/
├── people.csv          # metadata (obligatorio)
├── photos/             # fotos de referencia (una o más por persona)
│   ├── juan_perez_1.jpg
│   ├── juan_perez_2.jpg
│   └── maria_gomez_1.jpg
└── README.md           # este archivo
```

## `people.csv`

Columnas:

| Columna | Obligatorio | Descripción |
|---------|-------------|-----------|
| `name` | sí | Nombre completo |
| `photo` | sí | Archivo en `photos/` o ruta relativa |
| `status` | no | `buscado` (default) o `encontrado` |
| `contact` | no | Teléfono / WhatsApp de la familia |
| `location` | no | Última ubicación conocida |
| `notes` | no | Notas (edad, vestimenta, etc.) |

Varias filas con el mismo `name` = **múltiples fotos** de la misma persona (mejor recall).

Ver `people.example.csv` como plantilla.

## Requisitos de las fotos

- **Una cara visible** por foto (frontal o semi-frontal).
- Formato: JPEG, PNG o WEBP.
- Tamaño recomendado: > 200×200 px; evitar fotos muy pixeladas.
- Varias fotos por persona (diferentes ángulos/iluminación) mejoran matches.

## Flujo completo

```powershell
# 1. Indexar en GPU local
cd "C:\...\ML-FaceRecognizer"
.\.venv\Scripts\activate
python -m indexer build --registry ./registry --out ./index --batch-size 32

# 2. Subir al VPS
python -m indexer push --index ./index --target vps

# 3. Refrescar índice en la API (sin reiniciar)
curl -X POST http://149.56.129.7:8100/index/reload -H "x-api-key: TU_API_KEY"
```

## Frontend

Con `frontend/.env.local` apuntando al VPS, abrí `http://localhost:3000/buscar` para probar búsquedas contra el índice en producción.
