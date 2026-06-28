# Spec 05 — Deploy, seguridad y privacidad

## Deploy del API (VPS OVH)

### Opción A — systemd (recomendada para MVP, sin Docker)
- venv 3.12 + `requirements-cpu.txt`.
- Servicio systemd `face-api.service` (uvicorn, 1 worker, restart on-failure).
- Nginx reverse proxy + TLS (Let's Encrypt) → HTTPS obligatorio (cámara lo exige).
- Index en `~/face-api/index/`, actualizado por `indexer push` (scp) + `/index/reload`.

### Opción B — Docker
- Imagen multi-stage: base `python:3.12-slim`, instalar **torch CPU** desde
  `--index-url https://download.pytorch.org/whl/cpu` (evita arrastrar CUDA, ahorra ~2 GB).
- `HEALTHCHECK` a `/health`, usuario no-root, `EXPOSE 8000`.
- Reuso del Dockerfile de Shippear `capsule_qc_mvp/Dockerfile`.

> No usar Fly.io para inferencia GPU: innecesario, el indexado es local. Fly/CPU sólo si
> se quiere mover el API fuera del VPS.

## Pinning PyTorch (crítico)

| Entorno | Comando |
|---------|---------|
| Local GPU | `pip install -r requirements-gpu.txt` (torch cu128) |
| VPS CPU | `pip install -r requirements-cpu.txt` (torch cpu) |

- Local: `--index-url https://download.pytorch.org/whl/cu128` (Blackwell sm_120).
- VPS: `--index-url https://download.pytorch.org/whl/cpu`.
- `facenet-pytorch` se instala con `--no-deps` si intenta bajar un torch incompatible;
  sus deps reales (numpy, pillow, requests) van explícitas en el requirements.

## Seguridad (checklist)
- [ ] API key en todos los endpoints salvo `/health`.
- [ ] CORS restringido a `ALLOWED_ORIGINS`.
- [ ] Validación de uploads (magic bytes + tamaño).
- [ ] Lock + escritura atómica de la DB.
- [ ] Rate limiting en `/search` y `/register`.
- [ ] Secrets en `.env` (nunca en git; `.env.example` documentado).
- [ ] TLS/HTTPS en el VPS.

## Privacidad (datos sensibles — personas desaparecidas)
- Fotos, contactos y embeddings **fuera de git** (ver `.gitignore`).
- Política de retención: definir TTL para fotos de query (borrar tras procesar).
- Minimización: guardar sólo lo necesario para el reencuentro.
- Acceso al registro restringido (no buscador público abierto).
- Consentimiento: la familia que registra autoriza el uso de la foto.

## Evaluación del modelo (QA)
- Dataset de validación con fotos "de campo" (laterales, baja luz, antiguas), no sólo LFW.
- Métricas de verificación: FAR/FRR y curva por threshold; elegir umbral conservador.
- No publicar "100% accuracy": reportar precisión/recall por threshold sobre datos realistas.

## Criterios de aceptación
- [ ] API corriendo bajo systemd o Docker en el VPS con HTTPS.
- [ ] `indexer push` + `/index/reload` actualizan el índice en caliente.
- [ ] Checklist de seguridad completo antes de exponer públicamente.
