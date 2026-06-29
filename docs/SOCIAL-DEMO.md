# Somos Huella — Guiones de demo para redes (Twitter/X)

Assets de marketing para **Somos Huella** ([somoshuella.org](https://www.somoshuella.org)),
sistema de reconocimiento facial para el **reencuentro de personas**. Todos los videos usan
**celebridades demo (actores)** — *no* personas desaparecidas reales — y respetan el lenguaje
del producto: nunca "identificación automática", siempre **"posible coincidencia"** con
**verificación humana**.

> Producido con **Cursor Cloud Agents**: el agente arregló un bug de UI, levantó la app y
> grabó los videos con Playwright (`recordVideo`). Ver el video *Built with Cursor*.

## Estructura de entrega

```
docs/
├── SOCIAL-DEMO.md                ← este archivo (guiones)
└── social/
    ├── tweets.md                 ← 3 tweets listos para publicar
    ├── QA.md                     ← checklist pass/fail
    ├── screenshots/              ← PNG (desktop 1920×1080 y mobile)
    └── videos/
        ├── desktop/  (16:9, 1920×1080, .mp4 H.264)
        └── mobile/   (9:16, 1080×1920, .mp4 H.264)
```

## Verificar antes de grabar / republicar

```bash
curl https://api.somoshuella.org/health
curl -I https://www.somoshuella.org/ejemplos
```

Flujo de demo en vivo: `/ejemplos` → **"Probar con esta foto"** → `/buscar?demo=…` →
**"Buscar coincidencias"**. Angelina Jolie devuelve **~95%**, contacto **+1 555 0101**,
ubicación **La Guaira**.

> ⚠️ **Nota de despliegue:** estos videos se grabaron contra un build con el fix de UI de este
> PR (los resultados ahora persisten en pantalla). Producción mostrará lo mismo **una vez
> mergeado y redeployado** este PR. Ver `social/QA.md`.

---

## Desktop (16:9 · 1920×1080)

### 1. Hook — 15s · `videos/desktop/01_hook_15s.mp4`
- **Objetivo:** enganchar con el problema y la promesa, terminar en el CTA.
- **Escenas:** (0–3s) tarjeta "El problema: cuando muchas familias buscan a la vez, la memoria
  y las listas no alcanzan" → (3–12s) home con scroll al hero y al botón *Buscar por foto* →
  (12–15s) tarjeta "Somos Huella — cada rostro deja una huella".
- **Locución/copy sugerido:** *"Cuando muchas familias buscan a la vez, ninguna lista alcanza.
  Somos Huella convierte un rostro en una pista."*

### 2. Demo completa — ~34s · `videos/desktop/02_demo_60s.mp4`
- **Objetivo:** mostrar el flujo completo hasta la coincidencia.
- **Escenas:** título → `/ejemplos` (tarjetas de actores) → clic *Probar con esta foto*
  (Angelina) → `/buscar` con foto precargada → badge "foto encontrada en campo" →
  *Buscar coincidencias* → **resultado Angelina 95% · La Guaira · +1 555 0101** (visible ~10s) →
  tarjeta "La decisión final siempre es humana".
- **Copy:** *"Subís la foto de quien encontraste. El sistema sugiere posibles coincidencias del
  registro, ordenadas por parecido. La familia confirma."*

### 3. Multi-match — ~33s · `videos/desktop/03_multimatch_30s.mp4`
- **Objetivo:** demostrar robustez: 3 personas, 3 coincidencias correctas.
- **Escenas:** Angelina (95% · La Guaira) → Bradley (Caracas) → Kate (Maracaibo), cada una con
  su badge → cierre "coincidencias orientativas, siempre confirmadas con la familia".
- **Copy:** *"Cada foto encuentra a su persona en el registro. Tres ejemplos, tres aciertos."*

### 4. Built with Cursor — ~33s · `videos/desktop/04_built_with_cursor_45s.mp4`
- **Objetivo:** historia técnica + agradecimiento a Cursor + prueba de deploy en vivo.
- **Escenas:** tarjeta "Construido con Cursor" → repo de GitHub (`Repetto-A/ML-FaceRecognizer`)
  → **sitio en vivo** `https://www.somoshuella.org` (home + ejemplos) con badge "HTTPS · Cloudflare"
  → tarjeta final **"Gracias, Cursor ♥"**.
- **Copy:** *"De repo a producción con HTTPS y Cloudflare. Los videos y el fix de esta demo los
  hizo un agente de **Cursor** en la nube. ♥"*

### 5. Landing scroll — ~35s · `videos/desktop/05_landing_scroll_30s.mp4`
- **Objetivo:** mostrar el diseño "dossier humanitario" y los tres pasos.
- **Escenas:** título "diseño dossier" → scroll completo del home (hero → *Tres pasos, una sola
  intención* → secciones inferiores).
- **Copy:** *"Papel, serif y un acento óxido. Un producto sobrio para un tema sensible."*

---

## Mobile (9:16 · 1080×1920)

### 6. Demo Angelina mobile — ~30s · `videos/mobile/06_demo_angelina_45s.mp4`
- **Objetivo:** mismo flujo de demo, viewport de celular vertical, full-bleed.
- **Escenas:** título → `/ejemplos` → *Probar con esta foto* → búsqueda → **resultado 95% · La
  Guaira** → cierre "la familia decide".

### 7. Hook mobile — ~13s · `videos/mobile/07_hook_15s.mp4`
- **Objetivo:** gancho vertical para feed/stories.
- **Escenas:** tarjeta "Volver a encontrar a quien falta" → home en celular con scroll.

### 8. Carrusel-ready (stories) — 3 clips · `videos/mobile/08_carrusel_{1,2,3}_*.mp4`
- **Objetivo:** 3 clips cortos (~9s c/u) para un carrusel/stories.
- **Clips:** `08_carrusel_1_angelina` (95% · La Guaira) · `08_carrusel_2_paul` (Valencia) ·
  `08_carrusel_3_shea` (Mérida). Cada uno: búsqueda → coincidencia → badge.

### 9. "Subí una foto → ¡Es tal celebridad!" — ~29s · `videos/mobile/09_upload_es_celebridad.mp4`
- **Objetivo:** demo divertida y directa: el usuario **sube una foto** (no usa el botón demo) y
  aparece un cartel grande tipo *"¡Es Angelina Jolie!"*. Pensado para enganchar en stories/reels.
- **Escenas:** título "Subí una foto" → `/buscar` con badge "Toca 'Subir archivo'" → preview de la
  foto subida → *Buscar coincidencias* → **cartel central "¡Es Angelina Jolie! · 95% de parecido"**
  (con aclaración de verificación humana) → tarjeta de resultado real (95% · La Guaira · +1 555 0101)
  → cierre "Probalo vos · somoshuella.org · demo con actores".
- **Nota de tono:** el cartel "¡Es …!" es un gancho lúdico; el encabezado del modal y la app siguen
  diciendo **"posible coincidencia"** y **"el sistema no identifica de forma automática"**.

---

## Restricciones (cumplidas en todos los assets)
- Nunca "identificación automática" → siempre **"posible coincidencia"**.
- Aviso **"demo con actores"** visible en todos los videos (banner inferior).
- Disclaimer de **verificación humana** presente en el flujo de resultados.
- Sin datos de personas desaparecidas reales. Sin `.env`, API keys ni `.cursor/` commiteados.
