# Frontend — ML-FaceRecognizer (Somos Huella)

UI móvil-first para **registro** (familias) y **búsqueda por foto** (personas en
terreno), construida con **Next.js (App Router) + React 19 + TypeScript +
Tailwind 4**.

El dominio es sensible: el sistema **nunca afirma identidades**, sólo muestra
*posibles coincidencias* con un porcentaje de similitud y un disclaimer de
verificación humana siempre visible.

## Arquitectura del frontend

```
Navegador  ──►  /api/search   (Route Handler, server-side)  ──►  ${API_URL}/search
           ──►  /api/register (Route Handler, server-side)  ──►  ${API_URL}/register
                     │
                     └─ inyecta header  x-api-key: ${API_KEY}
```

La **API key vive sólo en el servidor**. El navegador llama a rutas internas
(`/api/*`) que actúan de proxy y agregan la autenticación. Por eso las variables
de entorno son `API_URL` / `API_KEY` (privadas), **no** `NEXT_PUBLIC_*`.

## Estructura

```
frontend/
├── app/
│   ├── api/
│   │   ├── register/route.ts   # proxy server-side -> ${API_URL}/register
│   │   └── search/route.ts     # proxy server-side -> ${API_URL}/search
│   ├── buscar/page.tsx         # pantalla de búsqueda
│   ├── registro/page.tsx       # pantalla de registro
│   ├── globals.css             # Tailwind v4 (@import "tailwindcss") + tema
│   ├── layout.tsx              # layout raíz, header/footer, nav
│   └── page.tsx                # home (navegación a registro/búsqueda)
├── components/
│   ├── MatchResults.tsx        # lista de coincidencias + barra de confianza + disclaimer
│   ├── PhotoCapture.tsx        # captura por cámara (getUserMedia) o archivo
│   ├── RegisterForm.tsx        # formulario de alta
│   └── SearchCapture.tsx       # captura + slider de umbral + resultados
├── lib/
│   ├── api.ts                  # cliente -> /api/search y /api/register (tipado)
│   ├── types.ts                # tipos del contrato de la API
│   └── server/proxy.ts         # helper server-side de proxy con x-api-key
├── .env.local.example
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

## Requisitos

- Node.js 18.18+ (recomendado 20 LTS o superior).
- La API FastAPI corriendo y accesible desde `API_URL`.

## Configuración

```bash
cp .env.local.example .env.local
# editá .env.local con la URL real de la API y la API key
```

| Variable  | Descripción                                            | Ejemplo                 |
|-----------|--------------------------------------------------------|-------------------------|
| `API_URL` | URL base de la API FastAPI (sin barra final).          | `http://localhost:8000` |
| `API_KEY` | Clave enviada como header `x-api-key` hacia la API.    | `clave-secreta`         |

## Cómo correr

```bash
npm install
npm run dev      # http://localhost:3000
```

Otros scripts:

```bash
npm run build      # build de producción
npm run start      # sirve el build
npm run typecheck  # chequeo de tipos (tsc --noEmit)
```

## Contrato de la API (referencia)

- `POST /search` — multipart: `photo` (File), `threshold` (0..1), `top_k` (number),
  header `x-api-key`.
  Respuesta: `{ query_id, matches: [{ person_id, name, similarity, distance, image_path, contact?, location? }], disclaimer }`.
- `POST /register` — multipart: `name`, `photo` (File), `status`, `contact?`,
  `location?`, header `x-api-key`.
  Respuesta: `{ person_id, name, message }`.
- `GET /health`.

## Cámara y HTTPS (importante en producción)

`navigator.mediaDevices.getUserMedia` sólo funciona en **contextos seguros**:
`localhost` durante el desarrollo, o **HTTPS** en producción. Si la app se sirve
por HTTP plano (sin TLS), el botón "Usar cámara" fallará y el usuario deberá
**subir un archivo** en su lugar (la app maneja ese caso y muestra el aviso).

Para producción: serví detrás de HTTPS (Vercel ya lo provee, o Nginx con
certificado TLS en el VPS).

## Notas de UX (dominio sensible)

- Nunca se afirma identidad: siempre "posible coincidencia (NN%)".
- Estados claros: sin foto, sin resultados sobre el umbral, y error de red.
- Disclaimer de verificación humana siempre visible en los resultados.
- Mobile-first, accesible (foco visible, `prefers-reduced-motion`, etiquetas ARIA)
  y de bajo consumo de datos.
```
