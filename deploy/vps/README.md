# Deploy en VPS OVH

## Estado actual (preparado)

| Item | Valor |
|------|--------|
| Ruta | `/home/ubuntu/face-api` |
| Servicio | `face-api` (systemd, enabled) |
| Puerto directo | `http://149.56.129.7:8100` |
| HTTPS (Caddy) | `https://facerec.repetto-a.com` → requiere DNS A → `149.56.129.7` |
| Device | CPU (`TORCH_DEVICE=cpu`) |

## Actualizar código

```bash
cd /home/ubuntu/face-api
git pull
sudo systemctl restart face-api
```

## Actualizar índice (desde tu PC con GPU)

```powershell
python -m indexer build --registry ./registry --out ./index
python -m indexer push --index ./index --target vps
```

Luego en el VPS (o vía API):

```bash
curl -X POST http://127.0.0.1:8100/index/reload -H "x-api-key: TU_API_KEY"
```

## Instalar dependencias (primera vez o tras cambio de requirements)

```bash
cd /home/ubuntu/face-api
python3 -m venv .venv
.venv/bin/pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
.venv/bin/pip install facenet-pytorch --no-deps
.venv/bin/pip install -r requirements-cpu.txt
```

## Logs

```bash
sudo journalctl -u face-api -f
sudo systemctl status face-api
```

## Secretos

El `.env` en el VPS (`chmod 600`) contiene `API_KEY`. No está en git.
