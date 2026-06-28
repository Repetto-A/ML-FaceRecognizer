"""Punto de entrada para `python -m indexer ...` (corre desde la raíz del proyecto)."""

from .cli import main

if __name__ == "__main__":
    raise SystemExit(main())
