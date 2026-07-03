# SYSTEM STATE
## RN Layout Engine

---

# LAST UPDATED
2026-07-03 — SESSION-0019: Fix — auto-vinculación del primer layout creado para un evento (`eventos.events.layout_id`), sin tocar el botón "Vincular" manual usado para versiones alternativas

---

# REPOSITORY

| Property | Value |
|---|---|
| Repo | `rn-layout-engine` |
| GitHub default branch | `main` |
| Active development branch | `main` |
| Legacy branch | `feat/vite-migration` — merged, kept for reference only |
| Related repo | `RealityNearProject` (EventOS backend — separate, independent) |

---

# FRONTEND STACK

| Layer | Technology | Version |
|---|---|---|
| Build tool | Vite | 6 |
| Framework | React | 19 |
| Language | TypeScript | 5 |
| Canvas engine | Konva / react-konva | 10 |
| Styling | Tailwind CSS | 4 (via `@tailwindcss/vite`) |
| Linting | ESLint | 9 |

**Note:** Next.js was removed in SESSION-0009 (DEC-0019). Do not re-introduce Next.js or any SSR framework into this frontend.

---

# FRONTEND STRUCTURE

```
frontend/
├── index.html              — Vite SPA entry point
├── vite.config.ts          — Build config (react plugin, tailwindcss plugin, @/ alias)
├── vercel.json             — SPA rewrites (moved here from repo root 2026-07-01)
├── tsconfig.json
├── src/
│   ├── main.tsx            — React root mount (StrictMode)
│   ├── App.tsx             — Auth guard + org-membership check + dashboard/editor router (path-based, no SPA router lib)
│   ├── index.css           — Global styles
│   ├── context/
│   │   └── LangContext.tsx     — EN/ES language context, string catalog, useLang() hook
│   ├── components/
│   │   ├── LayoutDashboard.tsx     — Flat list of layouts by org_id; new/open/duplicate/delete
│   │   ├── SinAcceso.tsx           — Shown when an authenticated user has no organization_members row
│   │   ├── LayoutEditor.tsx        — Column layout: DrawingToolbar → panels row → FooterLegend
│   │   ├── DrawingToolbar.tsx      — Tool selector + Medir sub-mode toggle + undo/redo + export (translated)
│   │   ├── FooterLegend.tsx        — CAD-style title block; branding: EventOS Layout / powered by / {company}
│   │   ├── canvas/
│   │   │   └── LayoutCanvas.tsx    — Konva Stage; exposes exportPNG/exportPDF via forwardRef
│   │   └── panels/
│   │       ├── AssetLibraryPanel.tsx   — 40 assets across 7 categories (incl. Shapes); EN/ES asset names
│   │       ├── CustomAssetsPanel.tsx   — User-saved custom assets (create from selection / delete)
│   │       ├── PropertiesPanel.tsx     — Element + drawing properties + delete/duplicate/z-order
│   │       └── LegendPanel.tsx         — Category color legend
│   ├── hooks/
│   │   ├── useCanvasState.ts       — Canvas + drawing + tool + metadata state + undo/redo (50-step history)
│   │   ├── useLayoutPersistence.ts — save/load/list/newLayout against Supabase, per org_id
│   │   └── useCustomAssets.ts      — CRUD for the "Mis Assets" panel, per user
│   ├── lib/
│   │   ├── supabase.ts             — Supabase client + checkOrgMembership()
│   │   ├── layoutService.ts        — CRUD + duplicate/fork for the `layouts` table; auto-links the first layout created for an event to `eventos.events.layout_id` via `.schema('eventos')` cross-schema calls (same Supabase project as `eventos-eventos-frontend`)
│   │   ├── assetService.ts         — CRUD for user-saved custom assets
│   │   └── drawingMath.ts          — Framework-agnostic geometry: length/angle/snap (Línea, Polígono), polygonAreaMeters (Shoelace), elementAreaMeters
│   └── types/
│       └── layout.ts               — LayoutElement (incl. shape:'polygon' + points), DrawingPrimitive, DrawingTool, LayoutMeta, etc.
```

---

# BRANCH STATE

| Branch | Tip commit | State | Notes |
|---|---|---|---|
| `main` | `eeae250` | **Pushed to origin, deployed** — SESSION-0019 (2026-07-03: auto-vinculación del primer layout de un evento). Previo: SESSION-0018 (9 commits, 2026-07-02) | `git rev-list --left-right --count origin/main...main` → `0 0`, confirmed clean |
| `feat/vite-migration` | `cb48499` | Legacy — merged, preserved for reference | Behind main. Safe to delete after office testing. |

**Merge status:** Complete. `feat/vite-migration` merged into `main` 2026-05-23. `main` is now canonical production branch. Auto-deploy confirmed healthy — push to `main` → `rn-layout-engine.vercel.app` updates automatically (confirmed again today: 9/9 pushes each triggered a "Ready" production deployment, verified via `vercel ls`/`vercel inspect`).

---

# VALIDATED BEHAVIORS
(baseline local, 2026-05-23 — rows dated 2026-07-02 were added/updated across today's 9 commits, see BRANCH STATE)

| Behavior | Status |
|---|---|
| `npm install` clean | ✅ |
| `npm run dev` starts Vite | ✅ |
| Canvas renders without freeze | ✅ |
| Zoom (wheel event) | ✅ |
| Pan (drag on Stage) — isolated from element drag | ✅ |
| Object drag — no accidental stage pan during asset drag | ✅ |
| Transformer handles (resize / rotate) | ✅ |
| No SSR errors | ✅ |
| Asset placement (click in library → element added to canvas) | ✅ |
| Element selection → Transformer + Properties panel wired | ✅ |
| Properties panel live update (x/y/w/h/rotation/name) | ✅ |
| Delete / Backspace removes selected element | ✅ |
| Delete / Backspace removes selected drawing | ✅ |
| Round tables render as circles | ✅ |
| New assets spawn near visible viewport center | ✅ |
| Footer legend (9 metadata fields, editable inline) | ✅ |
| Line / Arrow drawing tools | ✅ |
| Text annotation | ✅ |
| Drawing selection (click to select in pointer mode) | ✅ |
| Drawing color change via Properties panel | ✅ |
| Drawing opacity via Properties panel | ✅ |
| Element color change via preset swatches | ✅ |
| Element opacity via slider | ✅ |
| Export PNG ("Exportar Plano") — 2x resolution, footer included | ✅ |
| Export PDF — elementos alineados 1:1 con el canvas, incl. elementos rotados (fix: pivote de rotación en export igualado al de Konva, antes rotaba sobre el centro en vez de la esquina superior-izquierda) | ✅ |
| Export PDF — drawings (líneas, flechas, anotaciones de texto) incluidos en el PDF, alineados con el canvas y con bounding box del crop automático (antes exportPDF solo iteraba `elements`; drawings desaparecían del PDF aunque sí se veían en pantalla) | ✅ (verificado por análisis de código/geometría; pendiente de confirmación visual en app real con sesión autenticada) |
| 34 operational assets in library | ✅ |
| Modo Selección (default) vs Modo Mano — dos modos explícitos y mutuamente excluyentes en la toolbar (patrón Figma/Miro): en Selección, click-arrastre en área vacía dibuja un rectángulo de marquee-select y selecciona todo lo que intersecta al soltar; en Mano, click-arrastre desde cualquier punto (vacío o sobre un elemento) siempre hace pan, sin seleccionar ni mover elementos | ✅ verificado end-to-end en navegador real (Playwright + mocks de Supabase) |
| Shift+click agrega/quita un elemento de la selección actual (multi-select acumulativo) | ✅ verificado end-to-end |
| Barra espaciadora mantenida activa Modo Mano temporalmente desde cualquier herramienta (incluida Selección); al soltar, vuelve al modo/herramienta anterior sin alterar el estado persistido | ✅ verificado end-to-end (incl. indicador de modo en la toolbar) |
| Click en área vacía sin arrastrar deselecciona todo (Modo Selección); en Modo Mano nunca selecciona ni deselecciona | ✅ verificado end-to-end |
| Selección múltiple: estado canónico `selectedIds: Set<string>` en `useCanvasState`; `selectedId`/`selectedElement` quedan derivados (no-null solo si `selectedIds.size===1`) para no romper Properties panel, Transformer, Ctrl+D ni Delete | ✅ |
| Mover en bloque — con `selectedIds.size > 1`, arrastrar cualquier elemento de la selección mueve todo el grupo preservando posiciones relativas (drag imperativo de los nodos Konva hermanos vía `stage.findOne` durante el gesto, commit único a estado al soltar); con 1 solo elemento, comportamiento sin cambios | ✅ verificado end-to-end |
| Copiar en bloque (Ctrl+D) — con `selectedIds.size > 1`, duplica todo el grupo manteniendo la disposición relativa (+2m offset, igual que el caso simple) y dej las copias nuevas como selección activa, listas para mover de inmediato; con 1 solo elemento, comportamiento sin cambios | ✅ verificado end-to-end |
| Eliminar en bloque (Delete/Backspace) — con `selectedIds.size > 1`, borra todo el grupo en una sola operación; con 1 solo elemento, comportamiento sin cambios | ✅ verificado end-to-end |
| Undo/redo de operaciones en bloque — mover, copiar y eliminar en bloque quedan como UNA sola entrada de historial (un solo Ctrl+Z restaura todo el grupo afectado) | ✅ verificado end-to-end (`useCanvasState.updateElements/deleteElements/duplicateElements`, un solo `pushHistory()` por operación) |
| Z-order (Traer al frente / Enviar al fondo) — botones en Properties Panel (selección simple y múltiple); el orden de renderizado es simplemente el orden del array `elements` (usado tal cual por el Layer de Konva y por el loop de exportPDF), así que reordenar el array reordena canvas + PDF a la vez y persiste automáticamente al guardar (mismo JSON). Con selección múltiple, el grupo se mueve al frente/fondo preservando su orden relativo interno (`bringToFront`/`sendToBack` en `useCanvasState`) | ✅ verificado end-to-end (persistencia confirmada guardando y recargando vía `/editor/:id`) |
| Tamaño de fuente ajustable en anotaciones de texto — campo numérico en Properties Panel (`DrawingPrimitive.fontSize`, default 14px); se refleja de inmediato en el canvas (prop `fontSize` de `Konva.Text`) y en el PDF exportado (mismo pipeline de `exportPDF`, ya no hardcodea 14px) | ✅ verificado end-to-end (bbox del texto exportado escala proporcionalmente al fontSize) |
| Voltear horizontal / vertical (flip) para elementos de la librería de assets — botones en Properties Panel; `LayoutElement.flipX`/`flipY` controlan un Group interno anidado (offsetX/Y = ancho/alto + scaleX/Y = -1) separado del Group externo que maneja drag/rotate/resize, evitando que el flip se mezcle con el scale que usa el Transformer al redimensionar. Funciona sobre elementos rotados sin desalinear el pivote (bounding box idéntico antes/después del flip); reflejado en export PDF con la misma matemática vía `ctx.translate`+`ctx.scale` | ✅ verificado end-to-end (bbox en canvas y silueta en PDF idénticos antes/después de flip H+V sobre un elemento rotado 45°) |
| Dibujo de línea/flecha con lectura en vivo (tooltip flotante junto al cursor mostrando metros y grados, actualizado en cada `onDragMove`) y snap de ángulo — sin Shift, engancha suavemente a múltiplos de 15° si está a ≤5° de tolerancia; con Shift, fuerza el snap a múltiplos de 45° sin importar la tolerancia. Lógica pura reutilizable en `src/lib/drawingMath.ts` (`lengthMeters`, `angleDegrees`, `pointFromLengthAngle`, `applyAngleSnap` — sin dependencias de React/Konva, pensada para los batches de polígono y medición) | ✅ verificado end-to-end (tooltip en vivo, snap suave 43°→45°, snap forzado con Shift 22°→0°) |
| Properties Panel — campos Longitud (m) y Ángulo (°) para líneas/flechas seleccionadas; editar cualquiera recalcula el punto final manteniendo el origen fijo (y el otro valor sin cambios); no se agregó campo nuevo al modelo — se derivan de/escriben en `DrawingPrimitive.points`, así que persisten y se exportan a PNG/PDF sin cambios adicionales en el pipeline | ✅ verificado end-to-end (edición de Longitud y Ángulo, persistencia guardando+recargando, silueta correcta en PDF exportado) |
| Herramienta **Polígono** (contornos de terreno irregular, solo segmentos rectos) — click para colocar cada vértice, click en el primer vértice o doble-click para cerrar (detección de doble-click propia por distancia+tiempo entre mousedowns, NO el evento nativo `onDblClick` de Konva — ver nota abajo); reutiliza el mismo tooltip de longitud/ángulo en vivo y el mismo `applyAngleSnap` de `drawingMath.ts` que la herramienta Línea, segmento por segmento. El polígono se guarda como un `LayoutElement` más (`shape: 'polygon'`, categoría `primitive`) — NO como `DrawingPrimitive` — para heredar gratis todo lo ya construido: selección simple/múltiple (marquee, shift+click), mover, duplicar, eliminar, bloque, z-order, flip y rotación. Modelo de datos: `LayoutElement.points` — array plano `[x0,y0,x1,y1,...]` de offsets en **metros relativos a (x,y)** (la esquina superior-izquierda del bounding box, igual convención que width/height); `width`/`height` son el bounding box de esos puntos. Redimensionar con el Transformer reescala `points` por el mismo factor que width/height (`LayoutCanvas` `onTransformEnd`) para que la forma no "salte" a su tamaño original al soltar | ✅ verificado end-to-end (Playwright): polígono cóncavo en L de 6 vértices con segmentos a 0/90/180/270°, snap de ángulo suave y forzado, cierre por click-en-primer-vértice, seleccionable/movible, participa en multi-selección junto a otros elementos, persiste con la misma forma tras guardar+recargar, aparece correctamente en PNG y PDF exportados |
| **Bug encontrado y corregido durante la validación de Polígono**: Konva sintetiza su propio evento `dblclick` basado en "dos clicks sobre el mismo nodo objetivo dentro de una ventana de tiempo", NO en la distancia real entre los dos puntos de click. Dibujar un polígono sobre/cerca de un elemento existente grande (ej. una carpa) hacía que dos vértices consecutivos —aunque estuvieran a 100-200px de distancia— dispararan un `dblclick` fantasma y cerraran/descartaran el polígono a mitad de dibujo. Reemplazado por detección manual (ref con `{x,y,time}` del último mousedown; solo cuenta como doble-click si el siguiente mousedown llega a <400ms y <6px de distancia real) | ✅ corregido y verificado — regresión reproducida con un script Playwright dedicado antes y después del fix |
| Herramienta **Medir** — dos sub-modos **explícitos y mutuamente excluyentes** en la toolbar ("Distancia" / "Área", botones visibles solo con Medir activo; default al activar Medir: Distancia, siempre — nunca se recuerda el último usado). **Distancia**: cualquier click, sin importar si cae sobre espacio vacío o encima de un elemento existente, coloca el punto en la posición EXACTA del click — los elementos no capturan el click en este modo (`useCanvasState.measureMode`/`LayoutCanvas` no hacen hit-test alguno cuando `measureMode==='distance'`), permitiendo medir p.ej. entre el borde de una piscina y un árbol de una fila aunque ambos puntos caigan dentro de elementos. Segundo click muestra distancia y ángulo (sin snap, a diferencia de Línea/Polígono). **Área**: click sobre un elemento (rectángulo, óvalo o polígono libre) muestra su área real en m²; click en espacio vacío no hace nada (dependía antes de si el click "pegaba" o no en algo — ahora es 100% explícito por el sub-modo elegido, nunca inferido). Área calculada con `drawingMath.elementAreaMeters` (Shoelace para polígono — válido para formas cóncavas tipo L —, elipse `π·(w/2)·(h/2)` para círculo/óvalo, `width*height` para el resto; reutilizada también por el campo "Área" del Properties Panel). Cambiar de sub-modo limpia cualquier medición a medio hacer (punto de distancia pendiente, resultado previo). Medición 100% efímera — nunca toca `elements`/`drawings` — se limpia al cambiar de herramienta o de sub-modo | ✅ verificado end-to-end: Distancia mide correctamente entre dos puntos ambos dentro de elementos existentes (23.20m·0°, ignorándolos); cambiar Distancia→Área a mitad de una medición sin completar no deja estado corrupto (el punto pendiente se descarta, el siguiente click en Área mide área, no completa una distancia fantasma); Área en rectángulo 10×5m ≈ 50.00 m²; click en vacío en modo Área no altera el resultado previo mostrado; reactivar Medir siempre vuelve a Distancia; cero regresión en Polígono y marquee-select |
| **Bug encontrado y corregido**: antes de este fix, Medir tenía un solo comportamiento (cualquier click sobre un elemento medía área, sin excepción), lo que hacía imposible medir distancia entre dos puntos cuando ambos (o uno) caían sobre/dentro de elementos existentes — caso real reportado: medir la distancia entre el borde de una piscina y el primer árbol de una fila. Corregido separando Distancia/Área en sub-modos explícitos elegidos por el usuario en la toolbar, nunca inferidos por número de clicks ni timing | ✅ corregido y verificado |
| TypeScript 0 errors | ✅ |
| `#root` height chain — `h-full` resolves to full viewport | ✅ |
| `canvas { touch-action: none }` — prevents native scroll/pinch on canvas | ✅ |
| Touch pan (single finger) on Konva Stage | ✅ |
| Pinch-to-zoom (two finger) on Konva Stage | ✅ |
| Mobile panel toggles (☰ Library, ⊟ Properties) | ✅ confirmed on iPhone Safari |
| Panels hidden on mobile by default, canvas fills full width | ✅ confirmed on iPhone Safari |
| Panel overlay with backdrop tap-to-dismiss | ✅ |
| FooterLegend scrollable on narrow viewports | ✅ |
| Canvas renders on iPhone Safari (DPR=3, iOS Safari) | ✅ confirmed on device |
| Konva pixelRatio capped at 2 (canvas memory ≤ ~12.5 MB on DPR=3) | ✅ |
| Stage deferred until ResizeObserver fires (no premature 800×600 canvas) | ✅ |
| Duplicar layout (dashboard y editor) — crea registro nuevo e independiente, copia elements/drawings/meta/viewport, `parent_layout_id` → original, `version_number`=1, `name`="{original} (copia)", NO hereda `event_id`, redirige al editor del duplicado | ✅ (verificado por análisis de código; pendiente de confirmación visual en app real con sesión autenticada — requiere migración SQL aplicada primero, ver `supabase/migrations/`) |
| Guardar como copia (editor) — fork desde el ESTADO ACTUAL del canvas (incluye cambios no guardados), no desde el último guardado en DB; el original nunca se modifica | ✅ (mismo pendiente de confirmación visual que arriba) |
| "Carpeta de cliente" — NO existe como concepto en este repo (dashboard es lista plana por `org_id`; `cliente` es solo texto libre en `LayoutMeta`, sin FK ni agrupador). Ver DECISION_LOG / sesión 2026-07-02 | N/A — reportado, no construido |
| **Auto-vinculación del primer layout de un evento** (`layoutService.save()`, rama de creación/`insert`) — cuando el primer guardado de un layout nuevo trae `event_id` (llegó vía `?event_id=` en la URL, redirigido desde el tab Layout de `eventos-eventos-frontend`), se consulta `eventos.events.layout_id` para ese evento justo después del INSERT: si está `NULL` (nunca se vinculó ningún layout a este evento), se dispara automáticamente `UPDATE eventos.events SET layout_id = [nuevo layout id] WHERE id = [event_id]` — sin requerir click manual en "Vincular". Si `layout_id` YA tiene un valor (el evento ya tiene un layout oficial y este es un boceto/alternativa adicional), NO se auto-vincula — sigue apareciendo con el botón "Vincular" manual en `eventos-eventos-frontend`, igual que hoy, preservando el flujo de versiones múltiples (mismo patrón que quotes v1/v2 en Ventas). El auto-link nunca bloquea el guardado del layout si falla (try/catch propio, solo loggea a consola) — el botón "Vincular" manual sigue siendo el fallback. **Mecanismo cross-schema**: UPDATE/SELECT directos desde el cliente vía `supabase.schema('eventos').from('events')...` (misma llamada `.schema()` de `@supabase/supabase-js` que ya usa `eventService.updateEventLayout` en `eventos-eventos-frontend/src/services/eventService.ts:133-143`) — NO una función RPC; no existía ningún precedente de RPC para esto, y el repo hermano tampoco usa una, así que se replicó el mismo patrón de UPDATE directo, sin crear infraestructura nueva. `layouts` vive en el schema `public` (default, expuesto de fábrica); `eventos` ya estaba expuesto en Data API desde antes (Settings → Data API → Exposed schemas, hecho al construir `eventos-eventos-frontend`) — ambos repos comparten el mismo proyecto Supabase (`rn-layout-engine-v2`, `zwrekwltmipmdbautnwd.supabase.co`), confirmado comparando `VITE_SUPABASE_URL` en ambos `.env`. RLS de `eventos.events` (`members can access org events`) ya cubre este UPDATE sin cambios — se basa en `org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true)`, la misma tabla que `checkOrgMembership()` ya usa en este repo para el guard de acceso | ✅ verificado end-to-end en navegador real (Playwright, dev server real + mocks de red a nivel HTTP para Supabase, sin mockear el cliente JS): escenario evento sin `layout_id` → INSERT en `layouts` seguido de GET a `eventos.events` (header `Accept-Profile: eventos`) seguido de PATCH (header `Content-Profile: eventos`, body `{"layout_id":"<nuevo id>"}`); escenario evento con `layout_id` ya seteado → mismo INSERT + GET, pero CERO PATCH (auto-link correctamente omitido). Pendiente: confirmación con datos reales en producción (crear evento real en `eventos-eventos-frontend`, click "Crear layout" → "Nuevo layout" → confirmar que el tab Layout ya muestra "Abrir en Layout Engine" sin click manual en "Vincular") |

---

# DEPLOYMENT

**Status:** LIVE — auto-deployed 2026-07-03 (SESSION-0019), iPhone Safari confirmed 2026-05-23, pipeline healthy

| Property | Value |
|---|---|
| Provider | Vercel |
| **Canonical production URL** | **https://rn-layout-engine.vercel.app** |
| Canonical Vercel project | `javier-bambaren-d-s-projects/rn-layout-engine` |
| Current production deployment | `dpl_GTFzjqveK7tJKwQDdq4iTmzeAJvR` — commit `eeae250`, status **Ready**, confirmed via `vercel inspect` |
| Production branch | `main` |
| Auto-deploy | **Active** — push to `main` triggers production deploy (9/9 pushes today landed as Ready deployments) |
| Deployment Protection | Enabled — per-hash URLs require auth; alias URL does not |
| Legacy Vercel project (do not use) | https://frontend-eta-five-50.vercel.app — temporary debug artifact, manual-deploy only, pending deletion |

See DEPLOYMENT.md for full project details, mobile fix documentation, and rules.
See RISK-0020 for two-project governance risk.

---

# ROLLBACK STRATEGY

```bash
# Roll back via Vercel dashboard (preferred — no force push):
# Go to: vercel.com/javier-bambaren-d-s-projects/rn-layout-engine
# Find a previous "Ready" deployment → click "..." → "Promote to Production"

# Roll back via git revert (re-triggers auto-deploy cleanly):
git revert <commit-hash>
git push origin main
```

**WARNING:** Do NOT `git reset --hard` on `main` and force-push — this is the production branch and will discard commits. Use `git revert` instead.

See DEPLOYMENT.md rollback table for commit-level safety ratings.

---

# NEXT PRIORITIES

0. **⚠️ Ejecutar migración SQL pendiente** — `supabase/migrations/20260702000000_layout_duplication.sql` (agrega `parent_layout_id` + `version_number` a `layouts`). Sin esta migración, "Duplicar" y "Guardar como copia" fallarán en producción. Sigue sin ejecutarse — no hay acceso de service-role/CLI desde este entorno de agente. **Sigue siendo el bloqueante #1 antes de que Duplicar/Guardar como copia funcionen en producción real.**
1. **Office testing** — validar en el día a día real del equipo: exportar planos, duplicar/forkear layouts, dibujar polígonos de terreno irregular, medir distancias/áreas — todo lo construido en SESSION-0018 sigue sin probarse con datos y usuarios reales fuera de Playwright+mocks.
1b. **Validar auto-vinculación (SESSION-0019) con datos reales** — crear un evento real en `eventos-eventos-frontend`, tab Layout → "Crear layout" → "Nuevo layout" → Guardar → confirmar que al volver al evento el tab Layout ya muestra "Abrir en Layout Engine"/"Desvincular" sin click manual en "Vincular"; luego crear un SEGUNDO layout para el mismo evento y confirmar que ese NO se auto-vincula (aparece con botón "Vincular" manual). Validado hoy solo con mocks de red a nivel HTTP, no contra la base de datos Supabase real.
2. **Curvas bezier reales para Polígono** — explícitamente fuera de alcance del batch de hoy (solo segmentos rectos); evaluar como batch futuro si el caso de uso lo pide.
3. **Cotas formales tipo AutoCAD** (líneas de dimensión persistentes con flechas, distinto de la medición efímera de hoy) — explícitamente diferido como "batch futuro, evaluado aparte" en el spec de Medir de hoy.
4. **Cerrar o actualizar RISK-0015** en `docs/KNOWN_RISKS.md` — fue escrito cuando no existía ninguna persistencia ("localStorage" como remedio propuesto); hoy la persistencia real ya existe vía Supabase (`useLayoutPersistence` + `layoutService`, con duplicar/guardar como copia incluidos) — el riesgo tal como está redactado ya no aplica.
5. **Delete or archive `frontend` Vercel project** — debugging artifact. See RISK-0020.
6. **Remaining feature candidates:** Touch drawing support (RISK-0017), background image upload, "fit all" zoom
