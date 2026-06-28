# Somos Huella

> Repositorio: `ML-FaceRecognizer` · Producto: **Somos Huella** ([somoshuella.org](https://somoshuella.org))

Sistema de **reconocimiento facial para el reencuentro de personas**. Las familias
registran a un ser querido con una foto; quien lo encuentra sube una foto y el sistema
devuelve **posibles coincidencias** con el contacto de la familia, para verificación
humana. El nombre refleja la idea: cada rostro deja una *huella* —y cada persona que
falta deja una huella en quienes la buscan.

> ⚠️ El sistema **no identifica** personas de forma automática. Devuelve *candidatos
> probables* ordenados por similitud. La confirmación siempre es humana.

## Arquitectura (resumen)

El trabajo pesado de cómputo (generar embeddings de muchas fotos) corre en la **GPU local
(RTX 5060)**. El VPS sólo guarda los vectores y resuelve búsquedas, que son baratas.

```
┌────────────────────────┐         embeddings (vectores)        ┌─────────────────────┐
│  LOCAL — RTX 5060       │  ─────────────────────────────────► │  VPS OVH (CPU)      │
│  indexer/ (batch GPU)   │   index.npz / push API / pgvector    │  api/ search service │
│  genera embeddings      │                                      │  matching + REST     │
└────────────────────────┘                                      └─────────────────────┘
                                                                          ▲
                                                                          │ foto query
                                                                   ┌─────────────┐
                                                                   │ frontend     │
                                                                   │ Next.js      │
                                                                   └─────────────┘
```

Detalle completo en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) y specs en [`docs/specs/`](docs/specs/).

## Componentes

| Carpeta | Dónde corre | Rol |
|---------|-------------|-----|
| `core/` | local + VPS | Motor compartido: detección (MTCNN) + embeddings (InceptionResnetV1) + similitud |
| `indexer/` | local (GPU) | Indexado batch de la base de "buscados" → genera y sube embeddings |
| `api/` | VPS (CPU) | API REST de búsqueda y matching, endurecida (auth, validación, locking) |
| `frontend/` | Vercel/VPS | UI Next.js de registro y búsqueda (fase 3) |

## Hardware objetivo

- **Local:** RTX 5060 Laptop (8 GB VRAM, Blackwell `sm_120`) + 32 GB RAM → indexado GPU.
- **VPS:** OVH, 4 vCPU, 7.6 GB RAM, **sin GPU** → búsqueda y query embedding en CPU.

## Setup rápido

### Local (GPU — indexer)

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements-gpu.txt
python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"
```

> La RTX 5060 (Blackwell) **requiere PyTorch con CUDA 12.8 (`cu128`)**. Wheels más viejos
> (`cu118`/`cu121`) fallan con `no kernel image is available`.

### VPS (CPU — api)

```bash
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements-cpu.txt
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

## Estado

Proyecto en fase de **planificación + migración** desde el prototipo monolítico
(`reencuentros-ai` en el VPS). Ver `docs/specs/` para el detalle de cada fase.
