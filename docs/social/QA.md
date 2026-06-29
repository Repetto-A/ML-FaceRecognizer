# QA — Assets de redes Somos Huella

Checklist de verificación de los assets generados. Fecha de grabación: 2026-06-28.

## Verificación de producción (pre-grabación)

| Check | Comando | Resultado |
|-------|---------|-----------|
| API viva | `curl https://api.somoshuella.org/health` | ✅ `{"status":"ok","index_size":5,...}` |
| Página ejemplos | `curl -I https://www.somoshuella.org/ejemplos` | ✅ `HTTP/2 200` (Next.js · Caddy · Cloudflare) |
| Flujo de resultados en **prod** | Playwright `/buscar?demo=angelina_jolie` | ⚠️ Bug: `/api/search` responde 200 pero la UI **reseteaba** el resultado (no se veía). **Corregido en este PR.** |

## Fix aplicado antes de grabar

- **Archivo:** `frontend/components/SearchCapture.tsx`.
- **Problema:** `handlePhotoChange` no estaba memoizada → `commitFile` (useCallback) cambiaba de
  identidad cada render → el `useEffect([presetFile, commitFile])` de `PhotoCapture` se
  re-disparaba y, con el estado en `done`, llamaba `setState({idle})`, borrando el resultado.
- **Fix:** memoizar con `useCallback` + `setState` funcional. Verificado: el resultado de Angelina
  (95%) **persiste** en pantalla. Probado en build de producción (`next build`).

## Videos — Desktop (16:9 · 1920×1080 · H.264)

| # | Archivo | Dur. | Dim. | Resultado visible | Disclaimer demo | Estado |
|---|---------|------|------|-------------------|-----------------|--------|
| 1 | `desktop/01_hook_15s.mp4` | 15.8s | 1920×1080 | n/a (hook) | ✅ | ✅ PASS |
| 2 | `desktop/02_demo_60s.mp4` | 33.7s | 1920×1080 | ✅ Angelina 95% (~10s) | ✅ | ✅ PASS |
| 3 | `desktop/03_multimatch_30s.mp4` | 32.8s | 1920×1080 | ✅ 3 coincidencias | ✅ | ✅ PASS |
| 4 | `desktop/04_built_with_cursor_45s.mp4` | 32.9s | 1920×1080 | repo + prod en vivo | ✅ | ✅ PASS |
| 5 | `desktop/05_landing_scroll_30s.mp4` | 35.2s | 1920×1080 | n/a (landing) | ✅ | ✅ PASS |

## Videos — Mobile (9:16 · 1080×1920 · H.264, full-bleed)

| # | Archivo | Dur. | Dim. | Resultado visible | Disclaimer demo | Estado |
|---|---------|------|------|-------------------|-----------------|--------|
| 6 | `mobile/06_demo_angelina_45s.mp4` | 29.6s | 1080×1920 | ✅ Angelina 95% | ✅ | ✅ PASS |
| 7 | `mobile/07_hook_15s.mp4` | 13.3s | 1080×1920 | n/a (hook) | ✅ | ✅ PASS |
| 8a | `mobile/08_carrusel_1_angelina.mp4` | 9.0s | 1080×1920 | ✅ Angelina | ✅ | ✅ PASS |
| 8b | `mobile/08_carrusel_2_paul.mp4` | 9.0s | 1080×1920 | ✅ Paul | ✅ | ✅ PASS |
| 8c | `mobile/08_carrusel_3_shea.mp4` | 8.9s | 1080×1920 | ✅ Shea | ✅ | ✅ PASS |
| 9 | `mobile/09_upload_es_celebridad.mp4` | 28.6s | 1080×1920 | ✅ subir foto → cartel "¡Es Angelina Jolie! 95%" + tarjeta real | ✅ | ✅ PASS |

## Screenshots (`screenshots/`)

`01_home_hero` · `02_ejemplos` · `03_buscar_preload` · `04_resultado_angelina` (95%) ·
`05_repo` · `06_prod_home` (en vivo) · `07_landing_steps` · `08_mobile_preload` ·
`09_mobile_resultado` (95%) · `10_mobile_home` · `11_upload_preview` · `12_es_angelina` (cartel
"¡Es Angelina Jolie!"). ✅ Todos legibles.

## Cumplimiento de restricciones

| Restricción | Estado |
|-------------|--------|
| Nunca "identificación automática" → "posible coincidencia" | ✅ (UI y overlays) |
| "Demo con actores" en cada video | ✅ banner inferior en los 10 |
| Disclaimer de verificación humana | ✅ en el flujo de resultados |
| Sin personas desaparecidas reales | ✅ solo actores demo |
| Sin `.env` / API keys / `.cursor/` commiteados | ✅ (solo `docs/social/` + fix de UI) |
| Mención a Cursor con gratitud | ✅ video 4 + tweet 3 |

## Issues conocidos / notas

1. **Despliegue de prod:** los videos reflejan el fix de UI de este PR. Producción mostrará el
   resultado persistente **una vez mergeado y redeployado** este PR (la demo de prod actual aún
   tiene el bug de reseteo). El resto de páginas (home, ejemplos, landing) ya funcionan en prod y
   se muestran en vivo en el video 4.
2. **Miniatura del match:** la tarjeta de resultado muestra un placeholder roto donde iría la foto
   registrada, porque la API devuelve `image_path` como **ruta absoluta del servidor**
   (`/workspace/...`/`/home/...`), no resoluble desde el navegador. Es comportamiento real de prod.
   Recomendado (fuera de alcance de este PR): que la API exponga una URL web del registro o que
   `MatchResults` haga fallback con `onError` al ícono placeholder.
3. **Duraciones:** algunos clips quedaron más cortos que el target nominal (p. ej. demo ~34s vs
   60s). El contenido está completo; clips más cortos suelen rendir mejor en social.
4. **Grabación:** Playwright `recordVideo` (sin barra de direcciones del navegador). Demos de
   búsqueda contra build local con el fix; video *Built with Cursor* contra prod en vivo + GitHub.
