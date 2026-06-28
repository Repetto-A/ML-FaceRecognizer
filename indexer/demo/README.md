# Demo index — celebridades (LFW / facenet-pytorch)

Índice de demostración con 5 personas ficticias para probar búsqueda end-to-end.
**No son desaparecidos reales** — solo datos de prueba.

## Preparar fotos

```powershell
python scripts/download_demo_faces.py
```

## Construir y subir

```powershell
.\.venv\Scripts\activate
python -m indexer build --registry ./indexer/demo --out ./index/demo --batch-size 8
python -m indexer push --index ./index/demo --target vps
curl -X POST https://api.somoshuella.org/index/reload -H "x-api-key: TU_KEY"
```

La foto `*_2.jpg` de cada persona se usa en `/ejemplos` para simular “encontrada en campo”.
