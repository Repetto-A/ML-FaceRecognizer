"""
CLI del indexer — ML-FaceRecognizer (spec 02).

Convierte un registro de personas (carpeta de fotos + CSV) en un artefacto de índice
de embeddings (`embeddings.npz` + `index.json`) usando la GPU local, y lo sincroniza
al VPS.

Se ejecuta desde la RAÍZ del proyecto para que `from core import ...` resuelva:

    python -m indexer build  --registry ./registry --out ./index --batch-size 32
    python -m indexer push   --index ./index --target vps
    python -m indexer push   --index ./index --target supabase
    python -m indexer stats  --index ./index
"""

from __future__ import annotations

import os
import csv
import sys
import time
import shlex
import argparse
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Any

# Columnas reconocidas en people.csv
REQUIRED_COLUMNS = ("name", "photo")
METADATA_COLUMNS = ("contact", "location", "notes")
DEFAULT_STATUS = "buscado"

# Archivos del artefacto de índice (mismos nombres que core.IndexStore)
EMB_FILE = "embeddings.npz"
META_FILE = "index.json"
SKIPPED_FILE = "skipped.csv"

# Defaults de sincronización (override por variables de entorno / .env)
DEFAULT_VPS_HOST = "ubuntu@149.56.129.7"
DEFAULT_VPS_INDEX_PATH = "/home/ubuntu/face-api/index"
DEFAULT_SSH_KEY = r"C:\Users\conta\.ssh\droplet"


# ── Utilidades ──────────────────────────────────────────────
def _eprint(*args: Any) -> None:
    print(*args, file=sys.stderr)


def _warn_box(lines: List[str]) -> None:
    """Imprime una advertencia grande y visible en stderr."""
    width = max(len(s) for s in lines) + 4
    bar = "!" * width
    _eprint("\n" + bar)
    for s in lines:
        _eprint("! " + s.ljust(width - 4) + " !")
    _eprint(bar + "\n")


def _resolve_photo(photo: str, registry_dir: Path) -> Optional[Path]:
    """
    Resuelve la ruta de una foto. Prueba, en orden:
      1. Ruta directa (absoluta o relativa al cwd).
      2. Relativa a `<registry>/photos/`.
      3. Relativa a `<registry>/`.
    Devuelve el primer Path existente, o None si ninguno existe.
    """
    photo = (photo or "").strip()
    if not photo:
        return None

    candidates = [
        Path(photo),
        registry_dir / "photos" / photo,
        registry_dir / photo,
    ]
    for c in candidates:
        if c.is_file():
            return c
    return None


def _read_people_csv(csv_path: Path) -> List[Dict[str, str]]:
    """
    Lee people.csv y devuelve filas como dicts. Valida columnas obligatorias.

    Lanza ValueError si el CSV está malformado o le faltan columnas.
    """
    if not csv_path.is_file():
        raise ValueError(f"No existe el CSV de registro: {csv_path}")

    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise ValueError(f"CSV vacío o sin cabecera: {csv_path}")

        headers = {h.strip().lower(): h for h in reader.fieldnames if h is not None}
        missing = [c for c in REQUIRED_COLUMNS if c not in headers]
        if missing:
            raise ValueError(
                f"Faltan columnas obligatorias en {csv_path}: {', '.join(missing)}. "
                f"Encontradas: {', '.join(reader.fieldnames)}"
            )

        rows: List[Dict[str, str]] = []
        for raw in reader:
            # Normaliza claves a minúsculas y valores a str despojados.
            row = {
                k.strip().lower(): (v.strip() if isinstance(v, str) else "")
                for k, v in raw.items()
                if k is not None
            }
            rows.append(row)

    if not rows:
        raise ValueError(f"El registro no tiene filas de datos: {csv_path}")
    return rows


def _build_metadata(row: Dict[str, str]) -> Dict[str, str]:
    """Extrae metadata opcional (contact/location/notes) descartando vacíos."""
    return {k: row[k] for k in METADATA_COLUMNS if row.get(k)}


# ── Comando: build ──────────────────────────────────────────
def cmd_build(args: argparse.Namespace) -> int:
    import torch  # import diferido: pesado y sólo necesario en build
    from core import FaceMatcher, IndexStore

    registry_dir = Path(args.registry).expanduser().resolve()
    out_dir = Path(args.out).expanduser().resolve()
    csv_path = registry_dir / "people.csv"

    # 1. Validar registro y CSV
    if not registry_dir.is_dir():
        _eprint(f"ERROR: no existe el directorio de registro: {registry_dir}")
        return 2
    try:
        rows = _read_people_csv(csv_path)
    except ValueError as e:
        _eprint(f"ERROR: {e}")
        return 2

    # 2. Resolver device / validar CUDA
    cuda_ok = torch.cuda.is_available()
    if cuda_ok:
        device = "cuda"
    else:
        if not args.allow_cpu:
            _warn_box([
                "CUDA NO DISPONIBLE (torch.cuda.is_available() == False).",
                "El indexer está pensado para la GPU local (RTX 5060).",
                "Correr en CPU es MUCHO mas lento (~200-600 ms/foto).",
                "",
                "Si realmente querés continuar en CPU, repetí con --allow-cpu.",
            ])
            return 3
        device = "cpu"
        _warn_box([
            "Corriendo en CPU (--allow-cpu). Esto va a ser LENTO.",
            "Usalo solo para pruebas; el indexado real debe correr en GPU.",
        ])

    # 3. Resolver fotos (separar faltantes antes de cargar el modelo)
    skipped: List[Dict[str, str]] = []
    valid_rows: List[Dict[str, str]] = []
    valid_paths: List[Path] = []
    for row in rows:
        name = row.get("name", "")
        photo = row.get("photo", "")
        if not name:
            skipped.append({"name": name, "photo": photo, "reason": "fila sin 'name'"})
            continue
        resolved = _resolve_photo(photo, registry_dir)
        if resolved is None:
            skipped.append({"name": name, "photo": photo, "reason": "foto no encontrada"})
            continue
        valid_rows.append(row)
        valid_paths.append(resolved)

    total = len(rows)
    if not valid_paths:
        _eprint("ERROR: ninguna foto del registro pudo resolverse. Revisá rutas/CSV.")
        _write_skipped(out_dir, skipped)
        return 2

    # 4. Cargar modelo en GPU
    print(f"Cargando FaceMatcher en device={device} ...")
    matcher = FaceMatcher(device=device)
    if device == "cuda":
        try:
            print(f"GPU: {torch.cuda.get_device_name(0)}")
        except Exception:
            pass

    # 5. Extraer embeddings por lotes con barra de progreso
    try:
        from tqdm import tqdm
    except ImportError:
        tqdm = None  # degradación elegante si no está instalado

    store = IndexStore()
    indexed = 0
    batch_size = max(1, int(args.batch_size))

    t0 = time.perf_counter()
    pbar = (
        tqdm(total=len(valid_paths), unit="foto", desc="Indexando")
        if tqdm is not None
        else None
    )

    for start in range(0, len(valid_paths), batch_size):
        chunk_paths = valid_paths[start:start + batch_size]
        chunk_rows = valid_rows[start:start + batch_size]
        images = [str(p) for p in chunk_paths]
        try:
            embeddings = matcher.extract_batch(images, batch_size=batch_size)
        except Exception as e:
            # Si el lote entero falla, marcamos cada foto como saltada y seguimos.
            for row, path in zip(chunk_rows, chunk_paths):
                skipped.append({
                    "name": row.get("name", ""),
                    "photo": str(path),
                    "reason": f"error de inferencia: {e}",
                })
            if pbar is not None:
                pbar.update(len(chunk_paths))
            continue

        for row, path, emb in zip(chunk_rows, chunk_paths, embeddings):
            if emb is None:
                skipped.append({
                    "name": row.get("name", ""),
                    "photo": str(path),
                    "reason": "sin cara detectada",
                })
                continue
            store.add(
                embedding=emb,
                name=row["name"],
                status=row.get("status") or DEFAULT_STATUS,
                image_path=str(path),
                metadata=_build_metadata(row),
            )
            indexed += 1

        if pbar is not None:
            pbar.update(len(chunk_paths))

    if pbar is not None:
        pbar.close()

    elapsed = time.perf_counter() - t0

    # 6. Guardar artefacto + reporte de saltadas
    out_dir.mkdir(parents=True, exist_ok=True)
    store.save(out_dir)
    _write_skipped(out_dir, skipped)

    # 7. Resumen
    throughput = (len(valid_paths) / elapsed) if elapsed > 0 else 0.0
    gpu_name = ""
    if device == "cuda":
        try:
            gpu_name = torch.cuda.get_device_name(0)
        except Exception:
            gpu_name = "cuda"
    else:
        gpu_name = "CPU"

    print("\n" + "=" * 48)
    print("RESUMEN DE INDEXADO")
    print("=" * 48)
    print(f"  Filas en CSV     : {total}")
    print(f"  Indexadas        : {indexed}")
    print(f"  Saltadas         : {len(skipped)}")
    print(f"  Tiempo           : {elapsed:.2f} s")
    print(f"  Throughput       : {throughput:.1f} fotos/s")
    print(f"  Device           : {gpu_name}")
    print(f"  Índice           : {out_dir / EMB_FILE}")
    print(f"                     {out_dir / META_FILE}")
    if skipped:
        print(f"  Reporte saltadas : {out_dir / SKIPPED_FILE}")
    print("=" * 48)

    return 0


def _write_skipped(out_dir: Path, skipped: List[Dict[str, str]]) -> None:
    """Escribe skipped.csv (name, photo, reason). No hace nada si no hubo saltadas."""
    if not skipped:
        return
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / SKIPPED_FILE
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["name", "photo", "reason"])
        writer.writeheader()
        writer.writerows(skipped)


# ── Comando: push ───────────────────────────────────────────
def cmd_push(args: argparse.Namespace) -> int:
    if args.target == "supabase":
        raise NotImplementedError(
            "push --target supabase es la FASE 3 (Supabase pgvector / HNSW).\n"
            "Implica un `upsert` de los vectores a una tabla con columna `vector(512)` y\n"
            "que la API consulte con `ORDER BY embedding <=> query`. Todavía no implementado.\n"
            "Para el MVP (F1), usá: python -m indexer push --index <dir> --target vps"
        )

    if args.target != "vps":
        _eprint(f"ERROR: target desconocido: {args.target}")
        return 2

    index_dir = Path(args.index).expanduser().resolve()
    emb_path = index_dir / EMB_FILE
    meta_path = index_dir / META_FILE

    missing = [str(p) for p in (emb_path, meta_path) if not p.is_file()]
    if missing:
        _eprint("ERROR: faltan archivos del índice para subir:")
        for m in missing:
            _eprint(f"  - {m}")
        _eprint("¿Corriste `build` primero?")
        return 2

    host = os.environ.get("VPS_HOST", DEFAULT_VPS_HOST)
    remote_path = os.environ.get("VPS_INDEX_PATH", DEFAULT_VPS_INDEX_PATH)
    ssh_key = os.environ.get("SSH_KEY", DEFAULT_SSH_KEY)

    # remote_host es la parte después de "user@" para el mkdir por ssh.
    ssh_base = ["ssh", "-i", ssh_key, host]
    mkdir_cmd = ssh_base + ["mkdir", "-p", remote_path]

    scp_cmd = [
        "scp",
        "-i", ssh_key,
        str(emb_path),
        str(meta_path),
        f"{host}:{remote_path}/",
    ]

    print("Creando directorio remoto:")
    print("  " + " ".join(shlex.quote(c) for c in mkdir_cmd))
    try:
        subprocess.run(mkdir_cmd, check=True)
    except FileNotFoundError:
        _eprint("ERROR: no se encontró el binario `ssh`. Instalá OpenSSH client.")
        return 4
    except subprocess.CalledProcessError as e:
        _eprint(f"ERROR: falló mkdir remoto (exit {e.returncode}).")
        return e.returncode

    print("\nSubiendo índice por scp:")
    print("  " + " ".join(shlex.quote(c) for c in scp_cmd))
    try:
        subprocess.run(scp_cmd, check=True)
    except FileNotFoundError:
        _eprint("ERROR: no se encontró el binario `scp`. Instalá OpenSSH client.")
        return 4
    except subprocess.CalledProcessError as e:
        _eprint(f"ERROR: falló scp (exit {e.returncode}).")
        return e.returncode

    print(f"\nOK: índice subido a {host}:{remote_path}/")
    return 0


# ── Comando: stats ──────────────────────────────────────────
def cmd_stats(args: argparse.Namespace) -> int:
    from core import IndexStore

    index_dir = Path(args.index).expanduser().resolve()
    if not (index_dir / EMB_FILE).is_file() or not (index_dir / META_FILE).is_file():
        _eprint(f"ERROR: no hay un índice válido en {index_dir} "
                f"(faltan {EMB_FILE} y/o {META_FILE}).")
        return 2

    try:
        store = IndexStore.load(index_dir)
    except ValueError as e:
        _eprint(f"ERROR: índice corrupto: {e}")
        return 2

    counts = store.counts()
    if store.matrix is not None:
        shape = store.matrix.shape
        dtype = str(store.matrix.dtype)
    else:
        shape = (0, 0)
        dtype = "n/a"

    print(f"Índice: {index_dir}")
    print("-" * 40)
    print("Counts:")
    for k, v in counts.items():
        print(f"  {k:12s}: {v}")
    print("-" * 40)
    print(f"Matriz de embeddings: shape={shape}, dtype={dtype}")
    return 0


# ── Parser ──────────────────────────────────────────────────
def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m indexer",
        description="Indexador batch de embeddings faciales (GPU local) para ML-FaceRecognizer.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # build
    p_build = sub.add_parser("build", help="Genera el índice de embeddings desde un registro.")
    p_build.add_argument("--registry", required=True,
                         help="Directorio del registro (contiene people.csv y photos/).")
    p_build.add_argument("--out", required=True,
                         help="Directorio de salida del índice.")
    p_build.add_argument("--batch-size", type=int, default=32,
                         help="Tamaño de lote para la GPU (default: 32).")
    p_build.add_argument("--allow-cpu", action="store_true",
                         help="Permite continuar en CPU si no hay CUDA (lento).")
    p_build.set_defaults(func=cmd_build)

    # push
    p_push = sub.add_parser("push", help="Sube el índice al destino indicado.")
    p_push.add_argument("--index", required=True, help="Directorio del índice a subir.")
    p_push.add_argument("--target", required=True, choices=["vps", "supabase"],
                        help="Destino: vps (scp, F1) o supabase (pgvector, F3, stub).")
    p_push.set_defaults(func=cmd_push)

    # stats
    p_stats = sub.add_parser("stats", help="Muestra counts() y dimensiones del índice.")
    p_stats.add_argument("--index", required=True, help="Directorio del índice.")
    p_stats.set_defaults(func=cmd_stats)

    return parser


def main(argv: Optional[List[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
