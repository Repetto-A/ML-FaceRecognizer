"""
api — Servicio de búsqueda facial (VPS, CPU).

Refactor endurecido del `api.py` original (spec 03/05). Carga el índice generado por el
`indexer/`, embebe la query de búsqueda en CPU y devuelve posibles coincidencias.

Se ejecuta desde la raíz del proyecto:
    uvicorn api.main:app
"""

__all__ = ["main", "config", "security", "schemas", "uploads"]
