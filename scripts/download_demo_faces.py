"""Descarga fotos demo (facenet-pytorch test images) para índice y walkthrough."""

from __future__ import annotations

import sys
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://github.com/timesler/facenet-pytorch/raw/master/data/test_images"

PEOPLE = [
    ("angelina_jolie", "Angelina Jolie"),
    ("bradley_cooper", "Bradley Cooper"),
    ("kate_siegel", "Kate Siegel"),
    ("paul_rudd", "Paul Rudd"),
    ("shea_whigham", "Shea Whigham"),
]

REGISTRY_PHOTOS = ROOT / "indexer" / "demo" / "photos"
PUBLIC_DEMO = ROOT / "frontend" / "public" / "demo"


def download(url: str, dest: Path) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    try:
        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=60) as resp:
            data = resp.read()
        if not data:
            return False
        dest.write_bytes(data)
        return True
    except Exception as exc:
        print(f"  [warn] {dest.name}: {exc}")
        return False


def main() -> int:
    ok = 0
    for slug, _name in PEOPLE:
        for n in (1, 2):
            url = f"{BASE}/{slug}/{n}.jpg"
            reg_name = f"{slug.replace('_', '')}_{n}.jpg"
            pub_name = f"{slug}_{n}.jpg"
            if n == 1:
                if download(url, REGISTRY_PHOTOS / reg_name):
                    ok += 1
                download(url, PUBLIC_DEMO / pub_name)
            else:
                # facenet solo tiene 1.jpg; generamos variante para simular otra foto
                src = REGISTRY_PHOTOS / f"{slug.replace('_', '')}_1.jpg"
                if src.is_file():
                    from PIL import Image

                    img = Image.open(src)
                    w, h = img.size
                    cropped = img.crop((w // 8, h // 10, w - w // 10, h - h // 12))
                    cropped = cropped.resize((160, 160), Image.LANCZOS)
                    cropped.save(REGISTRY_PHOTOS / reg_name, quality=92)
                    cropped.save(PUBLIC_DEMO / pub_name, quality=92)
    print(f"Descargadas {ok} fotos de registro en {REGISTRY_PHOTOS}")
    print(f"Copias públicas en {PUBLIC_DEMO}")
    return 0 if ok >= len(PEOPLE) else 1


if __name__ == "__main__":
    sys.exit(main())
