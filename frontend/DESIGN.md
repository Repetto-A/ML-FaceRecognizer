# Design System: Somos Huella

> Fuente única de verdad para generar pantallas en Google Stitch.
> Pegá este archivo como contexto en labs.google.com/stitch antes de pedir
> cualquier pantalla. Las reglas de "Anti-Patterns" son tan importantes como
> las de estilo: si Stitch propone algo que las viola, se descarta.

## 0. Contexto del producto

Herramienta humanitaria para reunir familias. Una familia registra a un ser
querido con una foto; quien está en terreno busca por foto y recibe **posibles
coincidencias** ordenadas por parecido. El sistema sugiere, nunca confirma: la
decisión final es humana. El tono es **sobrio, cálido y digno** — ni alarmista
ni "startup divertida".

Dials de taste: **Variance 6** (asimétrico pero legible), **Motion 4** (CSS
fluido, nada cinematográfico), **Density 4** (app diaria, con aire).

## 1. Visual Theme & Atmosphere

Un "expediente vivo" sobre papel. La atmósfera es la de un archivo de búsqueda
bien cuidado: papel cálido con grano sutil, tinta carbón, una sola tinta de
acento color óxido. Editorial y humano gracias a un serif con carácter, pero
ordenado y técnico en los datos (monoespaciado para porcentajes). Nada de
dashboards oscuros con glow azul: eso aquí se lee como frío e impersonal.

## 2. Color Palette & Roles

- **Paper Warm** (#EFE9DC) — Fondo principal (lienzo papel).
- **Paper Soft** (#E7E0CF) — Fondo alterno / secciones tenues.
- **Card Linen** (#F6F1E6) — Relleno de fichas y contenedores.
- **Linen Sunk** (#E3DAC6) — Superficie hundida (tracks, miniaturas).
- **Hairline** (#D3C8B1) — Líneas estructurales de 1px.
- **Hairline Strong** (#BCAE92) — Bordes de énfasis / dashed de dropzones.
- **Charcoal Ink** (#221F1A) — Texto primario (carbón cálido, NO negro puro).
- **Warm Slate** (#5F5848) — Texto secundario, descripciones.
- **Faded Clay** (#8C8470) — Metadata, kickers, texto terciario.
- **Oxide** (#9A3B1B) — ACENTO ÚNICO: CTAs, foco, estado activo, acentos.
- **Oxide Deep** (#7C2F14) — Hover del acento.
- **Forest** (#3A6B4A) — Estado OK / similitud alta (desaturado).
- **Amber Earth** (#8A661C) — Advertencia / similitud media (desaturado).
- **Brick** (#9B2F1E) — Error / similitud baja (desaturado).

Máximo 1 acento (Oxide). Saturación < 80%. Una sola familia de grises (cálidos).
Prohibido azul/púrpura, neón y negro puro.

## 3. Typography Rules

- **Display:** `Fraunces` — serif moderno con carácter. Titulares con
  `tracking-tight`, peso 500, leading apretado (~0.98–1.0). La jerarquía la da
  el peso y el color, no un tamaño que grita.
- **Body / UI:** `Outfit` — sans geométrico cálido. Leading relajado, ancho de
  párrafo máx. 65ch, color Warm Slate para secundario.
- **Mono / Datos:** `JetBrains Mono` — porcentajes de similitud, IDs, métricas,
  kickers (label tipo expediente en mayúsculas con tracking amplio).
- **Banned:** `Inter`; serifs genéricos (`Times New Roman`, `Georgia`,
  `Garamond`). Serif jamás en tablas densas de datos: ahí solo sans + mono.

## 4. Component Stylings

- **Buttons:** Planos, sin glow. Primario relleno Oxide con texto papel;
  secundario como enlace subrayado (decoración Hairline → Oxide en hover).
  Feedback táctil `translateY(1px)` en `:active`. Transiciones 200–300ms.
- **Cards / Fichas:** Esquinas redondeadas medias (~14px). Borde Hairline; sombra
  solo si la elevación comunica jerarquía, y tintada al tono papel
  (`0 18px 40px -28px rgba(34,31,26,0.5)`). Para listas de pasos, preferir
  divisores de 1px o un grid de 1px sobre fondo Hairline, no cajas con sombra.
- **Resultados de coincidencia:** Ficha con **borde izquierdo de color** según
  el nivel de parecido (Forest/Amber/Brick), `%` grande en mono, miniatura
  squircle. El parecido es una pista, no un veredicto.
- **Inputs:** Label arriba (kicker mono), foco con anillo Oxide, helper debajo.
  Sin floating labels. Radios de "situación" como botones-segmento.
- **Loaders:** Skeletons con shimmer que respetan las dimensiones del layout.
  Nunca spinners circulares para contenido (sí un spinner pequeño dentro del
  botón "Buscando…").
- **Empty States:** Composición sobria con ícono lineal + sugerencia accionable
  ("bajá la exigencia de parecido o usá una foto más clara"), no "Sin datos".
- **Error States:** Banda con borde izquierdo Brick + mensaje directo, en línea.

## 5. Layout Principles

- Grid-first; nada de matemática de flexbox con `calc()`.
- Hero **asimétrico** (ej. 1.35fr / 1fr: titular a la izquierda, ficha
  "expediente vivo" a la derecha). Hero centrado prohibido.
- Prohibido el row de "3 tarjetas iguales": usar zig-zag de 2 columnas, grid
  asimétrico o lista numerada con divisores.
- Contenedor máx. ~1024–1400px centrado, padding interno generoso.
- Secciones full-height con `min-h-[100dvh]`, nunca `h-screen`.
- Sin solapamientos: cada elemento en su zona espacial limpia.

## 6. Responsive Rules

- Mobile-first: todo multi-columna colapsa a 1 columna < 768px. Sin scroll
  horizontal (falla crítica).
- Titulares con `clamp()`; cuerpo mínimo 1rem. Targets táctiles ≥ 44px.
- Panel de ajustes de búsqueda: sticky en desktop, apilado arriba en mobile.
- Nav horizontal en desktop; en mobile compacta y clara.

## 7. Motion & Interaction

- Reveals en cascada (stagger por índice, ~80ms) combinando translateY + opacity.
- Animar SOLO `transform` y `opacity`. Grano/ruido en pseudo-elemento fijo
  `pointer-events:none`, nunca sobre contenedores que scrollean.
- Respetar `prefers-reduced-motion` (desactivar reveals y loops).
- Micro-loops permitidos y sobrios: punto de estado "en línea" con pulse.

## 8. Anti-Patterns (NEVER DO)

- Sin emojis en ningún lado.
- Sin `Inter` ni serifs genéricos.
- Sin negro puro (#000000).
- Sin glow / sombras de neón; sin gradientes de texto en titulares.
- Sin cursores custom.
- Sin 3 tarjetas iguales en fila; sin hero centrado.
- Sin azul/púrpura "IA"; sin acentos sobresaturados; sin mezclar grises
  cálidos y fríos.
- Sin solapar elementos.
- Sin nombres genéricos ("John Doe", "Acme", "Nexus"); usar nombres realistas
  de la región (ej. "María Belén Ferreyra").
- Sin números redondos falsos (99.99%, 50%); usar datos orgánicos (47.2%).
- Sin clichés de copy ("Elevate", "Seamless", "Unleash", "Next-Gen").
- Sin texto de relleno ("Scroll to explore", flechas que rebotan).
- Sin links rotos de Unsplash. **Importante por el dominio:** no usar fotos de
  rostros de stock como decoración — es de mal gusto en un contexto de personas
  desaparecidas. Usar tratamiento tipográfico/gráfico.

## 9. Cómo pedirle pantallas a Stitch

Prompt sugerido: "Usá el DESIGN.md adjunto como sistema de diseño estricto.
Generá la pantalla [X]. Respetá TODOS los anti-patterns. Acento único Oxide
(#9A3B1B) sobre papel cálido. Serif Fraunces en titulares, Outfit en UI,
JetBrains Mono en datos. Layout asimétrico. Tono humanitario y sobrio."

Pantallas candidatas: Home, Buscar (con panel de ajustes), Resultados de
coincidencia, Registrar persona, Estado vacío, Estado de error.

## 10. Marca y voz — Somos Huella

**Nombre:** Somos Huella (dominio: somoshuella.org). En titulares oficiales no
abreviar a "Huella" sola; en cuerpo está bien hablar de "la huella" como concepto.

**Idea central:** cada rostro deja una *huella* (el embedding) y cada persona que
falta deja una huella en quienes la buscan. Reunimos esas huellas para volver a
encontrarse.

**Tagline:** "Cada huella nos acerca a casa."
Alternativas para campañas: "Ninguna huella se pierde." · "Volver a encontrarse,
huella por huella."

**Posicionamiento (Jobs to be Done):** la familia no quiere "un sistema de
reconocimiento facial"; quiere *volver a abrazar a quien busca*. Hablá del
resultado (reencontrarse), no de la tecnología.

**Voz:** digna, cálida, directa, esperanzada. Persona que acompaña, no software
que vende.

**Tono — sí:**
- Voz activa y frases cortas ("La decisión final es de una persona").
- Honestidad que genera confianza (decir qué *no* hace el sistema → efecto pratfall).
- Lenguaje de la familia, no de ingeniería ("ser querido", "volver a casa").

**Tono — no:**
- Sensacionalismo ni urgencia falsa ("¡Última oportunidad!"). El dolor real no se
  explota.
- Promesas de certeza ("identificamos", "confirmado"). Siempre "posible coincidencia".
- Jerga técnica fría en superficie ("vector de 512 dimensiones" → "huella del rostro").
- Signos de exclamación en mensajes de éxito; tono confiado, no estridente.

**Microcopy de referencia:**
- CTA primario: "Buscar por foto". Secundario: "Registrar a una persona".
- Éxito de registro: "Registro guardado" (sin "¡!").
- Coincidencia: "Posible coincidencia — verificar con la familia".
- Vacío: "Nadie supera el umbral" + cómo ajustar.
