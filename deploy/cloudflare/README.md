# Cloudflare DNS — somoshuella.org

Guía para pasar el DNS a Cloudflare (protección DDoS, WAF básico en Free, SSL edge)
y conectar el dominio al VPS OVH (`149.56.129.7`).

## Arquitectura objetivo

| Hostname | Destino en VPS | Uso |
|----------|----------------|-----|
| `somoshuella.org` | Next.js (frontend) | Sitio público |
| `www.somoshuella.org` | redirige a apex o mismo frontend | Alias |
| `api.somoshuella.org` | `face-api` (:8100) | API (indexer `push`, health) |

El navegador **no** ve la API key: el frontend Next.js llama a la API por servidor
(`API_URL` interno). `api.somoshuella.org` es para operaciones técnicas (indexer,
monitoreo) con `x-api-key`.

## Paso 1 — Agregar el sitio en Cloudflare

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Add a site** → `somoshuella.org`
2. Plan **Free** alcanza para empezar (DDoS, CDN, SSL universal).
3. Cloudflare escanea DNS → en tu caso salió **0 registros** (dominio nuevo). Normal.

## Paso 2 — Crear registros DNS (pantalla “Review your DNS records”)

Clic en **Add record** para cada uno. Deja el **proxy naranja activado** (Proxied)
para activar protección Cloudflare en el edge.

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| `A` | `@` | `149.56.129.7` | Proxied (naranja) |
| `A` | `www` | `149.56.129.7` | Proxied |
| `A` | `api` | `149.56.129.7` | Proxied |

Opcional (email más adelante): MX según tu proveedor de correo.

Luego **Continue to activation**.

## Paso 3 — Cambiar nameservers en el registrador

Cloudflare te da 2 nameservers (ej. `ada.ns.cloudflare.com`).

En donde compraste el dominio (Porkbun, Namecheap, etc.):

1. DNS / Nameservers → **Custom nameservers**
2. Reemplaza los NS del registrador por los de Cloudflare.
3. Propagación: 15 min – 48 h (suele ser rápido).

Hasta que los NS apunten a Cloudflare, el panel dirá **Pending**.

## Paso 4 — SSL/TLS (importante con Caddy en el VPS)

En Cloudflare → **SSL/TLS**:

| Opción | Valor recomendado |
|--------|-------------------|
| Overview | **Full (strict)** cuando Caddy tenga cert válido para `somoshuella.org` |
| Overview (mientras configuras) | **Full** temporal si el cert aún no existe |

**Full (strict)** = visitante → Cloudflare (HTTPS) → tu VPS (HTTPS con cert válido).
Caddy en Docker (`projects-caddy-1`) pide certificados Let's Encrypt automáticamente
al agregar el dominio en `/opt/projects/Caddyfile`.

En **Edge Certificates**: activar **Always Use HTTPS** y **Automatic HTTPS Rewrites**.

## Paso 5 — Caddy en el VPS (ya existe)

El VPS ya usa Caddy en Docker (`projects-caddy-1`, puertos 80/443).
Bloques a agregar en `/opt/projects/Caddyfile` (ver `deploy/vps/caddy-somoshuella.snippet`).

```bash
# En el VPS, tras editar Caddyfile:
cd /opt/projects && docker compose restart caddy
# o: docker restart projects-caddy-1
```

## Paso 6 — Variables en el VPS

En `/home/ubuntu/face-api/.env`:

```env
ALLOWED_ORIGINS=https://somoshuella.org,https://www.somoshuella.org
```

Reiniciar API: `sudo systemctl restart face-api`

## Paso 7 — Frontend (Next.js)

En el VPS, el frontend debe correr (Docker o `next start`) y Caddy debe hacer
`reverse_proxy` a ese servicio en `somoshuella.org`.

`.env` del frontend en producción:

```env
API_URL=http://172.17.0.1:8100
API_KEY=<la misma del VPS>
```

(`172.17.0.1` = host desde la red Docker de Caddy, igual que `facerec.repetto-a.com`.)

## Protecciones Cloudflare (Free, tras activar)

- **DDoS** en edge (automático con proxy naranja).
- **SSL** terminado en Cloudflare + certificado al origen.
- **Security → Settings**: Security Level **Medium** para empezar.
- **Bots**: Bot Fight Mode (Free) si querés filtrar bots obvios.
- **WAF** avanzado requiere plan Pro; para MVP el proxy + rate limit en la API alcanza.

## Verificación

```bash
# DNS resuelve a Cloudflare (IPs anaranjadas, no tu VPS directo si está proxied)
dig somoshuella.org +short

# API (tras Caddy + NS activos)
curl -s https://api.somoshuella.org/health

# Sitio
curl -sI https://somoshuella.org
```

## Troubleshooting

| Problema | Causa habitual |
|----------|----------------|
| 522 / timeout | VPS no responde en 80/443; Caddy caído |
| 525 SSL handshake | SSL mode "Full strict" pero Caddy sin cert |
| CORS error | Falta `somoshuella.org` en `ALLOWED_ORIGINS` |
| Cámara no funciona | Falta HTTPS en el sitio principal |
