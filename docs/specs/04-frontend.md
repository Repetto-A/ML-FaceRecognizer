# Spec 04 — `frontend/` Next.js (fase 3)

## Objetivo
UI móvil-first para registro y búsqueda, consumiendo la API del VPS. Reutiliza el patrón
ya probado en Shippear.

## Stack
Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4. Sin estado global
(hooks locales bastan), igual que Shippear.

## Pantallas
1. **Registro (familia):** nombre, última ubicación, contacto, foto (cámara o archivo).
   `POST /register`.
2. **Búsqueda (rescatista):** captura de cámara en vivo (`navigator.mediaDevices.getUserMedia`)
   o subida; slider de umbral; `POST /search`.
3. **Resultados:** lista de matches con barra de confianza, contacto, ubicación, y
   **disclaimer visible** "posible coincidencia — verificar con la familia".
4. **Admin (opcional):** `PeopleList` con baja.

## Componentes
| Componente | Reuso desde Shippear |
|------------|----------------------|
| `lib/api.ts` | `hackathon-v0-lavirginia-front-main/lib/api.ts` (FormData + manejo de errores) |
| `SearchCapture` | patrón `InspectionPanel` de `app/page.tsx` (drag-drop, preview, loading) |
| `RegisterForm` | nuevo, basado en el mismo patrón de upload |
| `MatchResults` | nuevo (barra de confianza + contacto) |

## Config
`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_API_KEY` (o proxy server-side para no exponer la key).

## UX crítica (dominio sensible)
- Nunca decir "es esta persona". Siempre "posible coincidencia (NN%)".
- Estados claros: sin cara detectada, sin resultados, error de red.
- Accesibilidad y bajo consumo de datos (Venezuela: redes pobres).

## Criterios de aceptación
- [ ] Registro y búsqueda funcionan contra la API real del VPS.
- [ ] Cámara funciona en móvil (HTTPS requerido para `getUserMedia`).
- [ ] Disclaimer de verificación humana siempre visible en resultados.

## Deploy
Vercel (skill `vercel-deploy`) o estático en el VPS detrás de Nginx.
