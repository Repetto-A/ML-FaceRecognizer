# registry.example/ — Ejemplo de formato de registro

Plantilla de cómo armar el registro que consume `python -m indexer build`.
**No incluye imágenes reales** — sólo el CSV con filas ficticias para mostrar el formato.

## Estructura real esperada

```
registry/
├── people.csv      # este archivo de ejemplo
└── photos/         # acá van las fotos (NO incluidas en el ejemplo)
    ├── juan_perez_1.jpg
    ├── juan_perez_2.jpg
    └── maria_gomez.jpg
```

> Datos sensibles (fotos, teléfonos) van **fuera de git** — ver `.gitignore` del proyecto.

## Columnas de `people.csv`

| Columna    | Obligatoria | Descripción                                                        |
|------------|-------------|--------------------------------------------------------------------|
| `name`     | Sí          | Nombre de la persona. Filas repetidas = varias fotos de la misma.  |
| `photo`    | Sí          | Nombre de archivo (en `photos/`) o ruta directa a la imagen.       |
| `status`   | No          | `buscado` (default) o `encontrado`.                                |
| `contact`  | No          | Teléfono/email de contacto. Va a `metadata` si no está vacío.      |
| `location` | No          | Última ubicación conocida. Va a `metadata`.                        |
| `notes`    | No          | Notas libres. Va a `metadata`.                                     |

## Resolución de `photo`

El indexer prueba, en orden:

1. Ruta directa (absoluta o relativa al directorio actual).
2. `registry/photos/<photo>`.
3. `registry/<photo>`.

Si ninguna existe, la fila se reporta en `index/skipped.csv` con motivo
`foto no encontrada` y el run continúa.

## Probarlo

Copiá esta carpeta a `registry/`, agregá tus fotos en `registry/photos/` y corré desde la
raíz del proyecto:

```bash
python -m indexer build --registry ./registry --out ./index --batch-size 32
```
