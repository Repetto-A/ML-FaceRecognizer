r"""
Smoke test end-to-end de core/ — valida el pipeline real en GPU.

Descarga 5 fotos (1 por persona) desde el repo de facenet-pytorch, y verifica:
  1. FaceMatcher carga (compat facenet-pytorch + torch 2.11 + CUDA en la 5060).
  2. extract_embedding detecta cara y devuelve vector (512,) L2-normalizado.
  3. Self-match = 1.0 y personas distintas tienen similitud baja (< 0.6).
  4. IndexStore add/save/load/search devuelve el match correcto.

Uso (desde la raíz):  .\.venv\Scripts\python.exe -m tests.smoke_core
"""

import sys
import tempfile
from pathlib import Path
from urllib.request import urlopen, Request

import numpy as np

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from core import FaceMatcher, IndexStore

BASE = "https://github.com/timesler/facenet-pytorch/raw/master/data/test_images"
IMAGES = {
    "angelina": f"{BASE}/angelina_jolie/1.jpg",
    "bradley":  f"{BASE}/bradley_cooper/1.jpg",
    "kate":     f"{BASE}/kate_siegel/1.jpg",
    "paul":     f"{BASE}/paul_rudd/1.jpg",
    "shea":     f"{BASE}/shea_whigham/1.jpg",
}


def download(url: str, dest: Path) -> bool:
    try:
        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=30) as r:
            dest.write_bytes(r.read())
        return dest.stat().st_size > 0
    except Exception as e:
        print(f"  [warn] no pude descargar {url}: {e}")
        return False


def main() -> int:
    tmp = Path(tempfile.mkdtemp(prefix="facerec_smoke_"))
    print(f"[1/5] Descargando imágenes de prueba a {tmp} ...")
    paths = {}
    for name, url in IMAGES.items():
        p = tmp / f"{name}.jpg"
        if download(url, p):
            paths[name] = p
    if len(paths) < 2:
        print("[skip] No se pudieron descargar las imágenes (¿sin internet?). "
              "Valido solo IndexStore con vectores sintéticos.")
        return synthetic_only()

    print("[2/5] Cargando FaceMatcher (descarga pesos VGGFace2 la 1ª vez)...")
    m = FaceMatcher()
    print(f"       device = {m.device}")

    print("[3/5] Extrayendo embeddings...")
    embs = {}
    for name, p in paths.items():
        e = m.extract_embedding(str(p))
        assert e is not None, f"No se detectó cara en {name}"
        assert e.shape == (512,), f"Shape inesperado: {e.shape}"
        norm = float(np.linalg.norm(e))
        assert abs(norm - 1.0) < 1e-3, f"Embedding no normalizado: ‖v‖={norm}"
        embs[name] = e
        print(f"       {name}: ok (‖v‖={norm:.4f})")

    names = list(embs.keys())
    print("[4/5] Verificando similitudes (self=1.0, cross<0.6)...")
    self_sim = float(np.dot(embs[names[0]], embs[names[0]]))
    assert abs(self_sim - 1.0) < 1e-3, f"Self-similarity != 1.0: {self_sim}"
    max_cross = 0.0
    for i in range(len(names)):
        for j in range(i + 1, len(names)):
            s = float(np.dot(embs[names[i]], embs[names[j]]))
            max_cross = max(max_cross, s)
            print(f"       {names[i]} vs {names[j]}: {s:.4f}")
    assert max_cross < 0.6, f"Dos personas distintas demasiado similares: {max_cross:.4f}"

    print("[5/5] Probando IndexStore (add/save/load/search)...")
    store = IndexStore()
    for name in names:
        store.add(embs[name], name=name.capitalize(), status="buscado", image_path=f"{name}.jpg")
    idx_dir = tmp / "index"
    store.save(idx_dir)
    loaded = IndexStore.load(idx_dir)
    assert loaded.size() == len(names), f"Esperaba {len(names)} registros, hay {loaded.size()}"
    target = names[0]
    hits = loaded.search(embs[target], top_k=5, threshold=0.5, status="buscado")
    assert hits, "Debería encontrar al menos un match"
    assert hits[0].record.name == target.capitalize(), f"Top match incorrecto: {hits[0].record.name}"
    print(f"       buscando '{target}' → top match: {hits[0].record.name} (sim={hits[0].similarity:.4f})  ✓")

    print("\n✅ SMOKE TEST OK — pipeline facial completo funciona en", str(m.device))
    return 0


def synthetic_only() -> int:
    rng = np.random.default_rng(0)
    a = rng.standard_normal(512).astype(np.float32)
    b = rng.standard_normal(512).astype(np.float32)
    store = IndexStore()
    store.add(a, name="A", status="buscado")
    store.add(b, name="B", status="buscado")
    with tempfile.TemporaryDirectory() as d:
        store.save(d)
        loaded = IndexStore.load(d)
    assert loaded.size() == 2
    hits = loaded.search(a, top_k=1, threshold=0.5)
    assert hits and hits[0].record.name == "A"
    print("✅ IndexStore OK (synthetic). Saltado el pipeline facial por falta de imágenes.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
