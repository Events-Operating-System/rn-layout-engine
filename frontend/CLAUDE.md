@AGENTS.md

---

## Known Bugs (not part of active work — do not fix without explicit instruction)

- **`get_event_summary` RPC — "Could not find the function public.get_event_summary(p_event_id) in the schema cache"**. Reported from the browser console in `eventos-eventos-frontend` (not this repo, but same Supabase project — relevant here because it's the same schema-cache/cross-schema surface area as the layout auto-link feature). The function `get_event_summary(event_id)` was created in `eventos.get_event_summary()` (per `CLAUDE.md`/session log in `eventos-eventos-frontend`, added ad-hoc via Supabase Studio, never committed as a tracked migration — see `eventos-eventos-frontend/src/services/eventSummaryService.ts:6`, `.rpc('get_event_summary', { p_event_id: eventId })` with no `.schema('eventos')` chained before the `.rpc()` call). Supabase's PostgREST resolves unqualified `.rpc()` calls against the `public` schema (or whatever schema is set via `.schema()`) — since the call doesn't chain `.schema('eventos')`, PostgREST looks for `public.get_event_summary` and doesn't find it, hence the schema-cache error. Likely fix (not applied): either call it as `supabase.schema('eventos').rpc('get_event_summary', ...)`, or move/duplicate the function into `public`. Flagged 2026-07-03 during the layout auto-link investigation; not touched in that batch.

---

## Session Log

### Sesión 2026-06-29
**Completado:**
- Implementada pantalla SinAcceso para usuarios autenticados sin membresía
- checkOrgMembership() consulta public.organization_members con .maybeSingle()
- App detecta membresía null → navega a /sin-acceso automáticamente
- Ruta /sin-acceso fuera del guard de auth
- Verificado en producción: usuarios externos ven pantalla "Sin acceso" limpia
- Verificado: usuarios JBD ven sus layouts normalmente

**Próximo paso:**
- Fase 2: Self-service onboarding para nuevas organizaciones

### Sesión 2026-07-01
**Completado:**
- Columna event_id agregada a tabla layouts
- Banner "Creando layout para evento" cuando hay event_id en URL
- layoutService.save() acepta event_id opcional
- Ruta /editor/:layoutId para abrir layout directamente
- vercel.json movido a /frontend/ para SPA rewrites correctos
- Redirect a Identity cuando no hay sesión en /editor/:layoutId
- VITE_IDENTITY_URL agregada como variable de entorno

**Próximo paso:**
- Fixes de Layout Engine (lista pendiente con Javier)
- Layout 3D con Three.js

### Sesión 2026-07-02
**Completado:**
- Fix export PDF: pivote de rotación igualado al de Konva + drawings (líneas/flechas/texto) incluidos en el PDF
- Duplicar layout y "Guardar como copia" — fork independiente, `parent_layout_id`/`version_number` (migración SQL creada, pendiente de ejecutar)
- Modo Selección vs Modo Mano + marquee-select + selección múltiple (`selectedIds: Set<string>`)
- Mover/copiar/eliminar en bloque sobre `selectedIds`, con undo/redo de una sola entrada por operación
- Z-order, tamaño de texto ajustable y flip horizontal/vertical para elementos
- Lectura en vivo + snap de ángulo (15°/45° con Shift) al dibujar líneas; campos Longitud/Ángulo en Properties Panel
- Herramienta Polígono libre (segmentos rectos, modelo `LayoutElement.points`) + herramienta Medir (distancia/área real vía Shoelace/elipse)
- Fix: Medir separado en sub-modos explícitos Distancia/Área (antes, cualquier click sobre un elemento medía área sin excepción, bloqueando medir distancia entre puntos dentro de elementos)
- 9 commits, todos pusheados a `main`, cada uno desplegado y confirmado "Ready" en Vercel

**Próximo paso:**
- ⚠️ Ejecutar `supabase/migrations/20260702000000_layout_duplication.sql` — bloqueante para que Duplicar/Guardar como copia funcionen en producción
- Office testing de todo lo de hoy con el equipo real (fuera de Playwright+mocks)
- Evaluar como batches futuros, si se necesitan: curvas bezier reales para Polígono, cotas formales tipo AutoCAD
- Revisar/cerrar RISK-0015 en `docs/KNOWN_RISKS.md` — quedó obsoleto desde que existe persistencia real vía Supabase

### Sesión 2026-07-03
**Completado:**
- Fix: auto-vinculación del primer layout creado para un evento. El botón "Vincular" manual y el tab Layout con la lista "Layouts creados para este evento" NO viven en este repo — viven en `eventos-eventos-frontend` (`src/pages/EventoDetalle.tsx` `LayoutTab`, `src/services/eventService.ts`). Ese repo hace `supabase.schema('eventos').from('events').update({layout_id})` directo desde el cliente, sin RPC — mismo proyecto Supabase que este repo (`rn-layout-engine-v2`, `zwrekwltmipmdbautnwd.supabase.co`), confirmado por `VITE_SUPABASE_URL` idéntico en ambos `.env`
- `layoutService.save()` (rama insert) ahora, tras crear el layout, consulta `eventos.events.layout_id` para el `event_id` recién guardado; si es `NULL` (primer layout del evento), dispara `UPDATE eventos.events SET layout_id = [nuevo id]` automáticamente vía el mismo mecanismo `.schema('eventos')`; si ya tiene valor (evento con layout oficial + boceto/alternativa nueva), NO auto-vincula — el botón "Vincular" manual en `eventos-eventos-frontend` sigue intacto para ese caso (versionado tipo quotes v1/v2 de Ventas)
- Nuevos métodos `layoutService.getEventLayoutId()` / `layoutService.linkEventLayout()`, ambos cross-schema vía `.schema('eventos')`
- Verificado end-to-end en navegador real (dev server + Playwright con mocks de red HTTP, no del cliente JS): ambos escenarios (auto-link cuando `layout_id` es null, no-auto-link cuando ya tiene valor) confirmados por las llamadas de red reales (`Accept-Profile`/`Content-Profile: eventos`)

**Próximo paso:**
- ~~Validar con datos reales en producción~~ — ver SESSION-0020 abajo (mismo día): el reporte inicial de que no funcionaba resultó ser un bug de otro repo, no de este fix
- Mismos pendientes de sesiones anteriores (migración de duplicación sin ejecutar, office testing general)

### Sesión 2026-07-03 (continuación) — SESSION-0020: diagnóstico del auto-link roto en producción
**Contexto:** el fix de SESSION-0019 (`eeae250`/`d4f4464`) no funcionó en producción — se crearon 2 layouts nuevos para un evento sin layout previo y ninguno se auto-vinculó, incluido el primero (que según el diseño debía auto-vincularse).

**Completado (solo diagnóstico, sin aplicar fix todavía):**
- Descartado por evidencia directa: el deploy de producción SÍ incluye el código del fix (`curl` al bundle JS servido en `rn-layout-engine.vercel.app`, confirmado string `auto-link` y dos llamadas `.schema("eventos")` presentes)
- Descartado (parcialmente, sin JWT de usuario real): acceso al schema `eventos` vía Data API funciona a nivel de esquema/columna — `GET eventos.events?select=id,layout_id` con la anon key devuelve `200 []` (respuesta válida, no error de "schema/columna no encontrada"), lo que sugiere que el schema cache de PostgREST sí reconoce `eventos.events.layout_id`. No descarta RLS bloqueando para un usuario autenticado real, solo descarta que el problema sea "schema no expuesto" o "columna no cacheada"
- Instrumentado `layoutService.ts` con logging temporal `[auto-link]` (prefijo consistente): loguea el disparo del intento (event_id + nuevo layout_id), el valor de `eventos.events.layout_id` devuelto por `getEventLayoutId`, y el resultado del UPDATE — `linkEventLayout` ahora encadena `.select('id, layout_id').maybeSingle()` (antes no seleccionaba nada) específicamente para poder distinguir un UPDATE que sí afectó una fila de uno bloqueado silenciosamente por RLS (0 filas, sin error — comportamiento normal de Postgres/PostgREST, no un bug de Supabase)
- Hallazgo secundario, NO confirmado como causa raíz de este bug específico (los layouts sí llegaron con `event_id` seteado, así que el usuario ya estaba autenticado cuando guardó): `App.tsx` `handleLogin()` llama `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })` — `window.location.origin` descarta el query string. Si un usuario NO autenticado llega a `/?event_id=X` y hace login recién ahí, vuelve a `/` sin `event_id` tras el OAuth roundtrip. Vale la pena revisarlo aparte, pero no es la causa de este reporte (los `event_id` de ambos layouts sí llegaron a `layouts.event_id`, confirmado porque aparecen en la lista del tab Layout)
- Documentado bug aparte no relacionado: `get_event_summary` (ver sección "Known Bugs" arriba)

**Resuelto (2026-07-03, el mismo día) — el usuario reprodujo en producción con su propia sesión:**
- Los logs `[auto-link]` confirmaron que el UPDATE a `eventos.events` **siempre se ejecutó sin error y con la fila devuelta correctamente** (`layout_id` bien seteado desde el primer intento) — descarta la hipótesis de RLS bloqueando en silencio. El código de este repo (`layoutService.save()`/`getEventLayoutId`/`linkEventLayout`) nunca tuvo el bug
- **La causa real vivía en `eventos-eventos-frontend`, no en este repo**: `EventoDetalle.tsx` carga el evento una sola vez al montar y nunca lo vuelve a pedir — la pantalla del tab Layout seguía mostrando `layout_id = null` (botón "Vincular" manual) aunque la escritura ya hubiera ocurrido bien, hasta un refresh manual. Corregido ahí con un refetch en `window focus` + `visibilitychange`, commit `5c49733` en `eventos-eventos-frontend` — sin ningún cambio adicional en `rn-layout-engine`
- Validado manualmente por el usuario en producción con capturas de pantalla: auto-link + historial de layouts funcionan correctamente end-to-end
- **Logging retirado parcialmente**: se quitaron los `console.log` verbosos de cada guardado (disparo del intento, valor de `layout_id` consultado, confirmación de éxito) por ser ruido innecesario en producción a largo plazo. Se dejó como mejora permanente el `.select('id, layout_id').maybeSingle()` en `linkEventLayout` (detecta si algún día un UPDATE es bloqueado por RLS sin lanzar error — solo entonces loggea un `console.warn`), y el `console.error` en el catch general (ya existía desde SESSION-0019, comportamiento defensivo estándar, no diagnóstico)

### Sesión 2026-07-08 — SESSION-0021

**Bug 1 — "Cargando..." indefinido al abrir un layout desde Eventos por primera vez (requería refresh manual):**
- Causa real en dos repos, confirmada por código, no supuesta:
  - `eventos-identity-frontend/src/pages/Login.tsx` construía el `redirectTo` del OAuth concatenando `"/callback"` al final de la URL completa de redirect (incluyendo su query string). Para redirects sin query (FieldOps, Inventarios) no se notaba; para `rn-layout-engine` (`/editor/:id?event_id=X`) corrompía `event_id` a `"X/callback"` y mandaba el callback de OAuth a la ruta equivocada en vez de aterrizar limpio. Fix: se reconstruye con la URL API insertando `/callback` en el pathname y preservando el query string — verificado que para FieldOps/Inventarios el resultado es byte-idéntico al anterior (commit `0ef392f`)
  - `App.tsx`: el `getSession()` inicial no tenía timeout. `supabase-js` procesa el implicit-grant callback vía un fetch interno (`_getUser`) sin `AbortController` ni timeout — si ese fetch se cuelga, `checking` nunca pasa a `false` y la UI queda en "Cargando..." para siempre, sin error visible (mismo patrón que el bug de geolocalización de FieldOps). Como el hash de tokens solo se limpia de la URL *después* de que ese fetch resuelve, un refresh manual reintenta con los mismos tokens (aún válidos) y normalmente funciona — de ahí el síntoma "un refresh lo arregla". Fix: timeout de 10s con estado de error visible + botón "Reintentar"; `getLayoutIdFromPath()` ahora también reconoce `/editor/:id/callback` (commit `7391bf8`)
- Ambos fixes deployados y verificados contra el sitio en vivo (no solo el output del CLI): `last-modified` fresco, `x-vercel-cache: MISS`, y el bundle servido contiene los strings nuevos (`"No se pudo verificar tu sesión"`, `classList.remove("overflow-hidden")` del bug 2 más abajo)

**Hallazgo de infraestructura (no un bug de código, un problema de configuración de Vercel):**
- El deploy de `rn-layout-engine` en Vercel **nunca fue automático por push a `main`**, a pesar de que `docs/DEPLOYMENT.md` lo documentaba así. Confirmado con `gh api repos/.../commits/<sha>/check-runs` y `.../status` → `total_count: 0` para *todos* los commits del repo, incluyendo commits de semanas atrás ya dados por "verificados en producción". Contraste: `eventos-identity-frontend` sí tiene el webhook funcionando (status `"success"` real en GitHub). Todo deploy de producción de este repo siempre fue manual vía `vercel --prod` (CLI, usuario `jbd84`)
- `docs/DEPLOYMENT.md` corregido con el flujo real: `vercel link --yes --project prj_3FI1KiHhe03aL3YuzpdSjDCGteVY` desde la raíz del repo (crea `.vercel/repo.json` con `"directory": "frontend"`, formato repo-aware — no crear `frontend/.vercel/project.json` a mano, ese era el link viejo que apuntaba al proyecto `frontend` deprecado) + `vercel --prod` desde la raíz. Se agregó paso de verificación contra el sitio en vivo (`curl -sI .../ | grep last-modified`) en vez de confiar solo en el output del CLI (commit `2ab9c5f`)
- **Pendiente:** no se investigó *por qué* el webhook de `rn-layout-engine` específicamente no dispara (vs. Identity que sí funciona) — si se quiere volver a auto-deploy por push, hay que revisar/reconectar la integración Git en el dashboard de Vercel

**Bug 2 — Grid de "Layouts" no hace scroll con 18+ layouts (ni mouse ni teclado):**
- Causa: `frontend/index.html` fija `<body class="h-full overflow-hidden">` globalmente — correcto para el Editor (Konva necesita dueño exclusivo del viewport, sin scroll nativo de página/pinch). Como es un solo `index.html` compartido por toda la SPA, `LayoutDashboard` heredaba el mismo `overflow: hidden` aunque su grid (`min-h-screen`) sí crece más que el viewport con muchos layouts — sin ningún ancestro scrollable en la cadena, el contenido quedaba recortado sin scrollbar
- Fix: `LayoutDashboard.tsx` remueve la clase `overflow-hidden` de `document.body` mientras está montado y la restaura al desmontar (vuelta al Editor) — cero cambios a `index.html`/`index.css` compartidos
- Reproducido y verificado con Playwright contra el dev server real (componente real, CSS real, sin mocks de layout, harness temporal descartado tras la prueba): con 18 layouts el contenido excede el viewport (1430px vs 800px) y scrollea con rueda y con PageDown; con 3 layouts cabe exacto (800px vs 800px) y no se dispara ningún scroll — sin scrollbar innecesaria en listas cortas (commit `6ebfeb7`)

**Próximo paso:**
- Confirmar con Javier el resultado de sus pruebas reales de login (Layout Engine + FieldOps/Inventarios) antes de dar el Bug 1 por cerrado del todo
- Revisar/reconectar el webhook Git↔Vercel de `rn-layout-engine` si se quiere recuperar auto-deploy por push
- Mismos pendientes de sesiones anteriores (migración de duplicación sin ejecutar, office testing general)

### Sesión 2026-08-10 — SESSION-0022

**Completado:**
- Corregido bug de datos: `public.layouts.org_id` estaba mal poblado en el 100% de las filas existentes (43/43) — igual a `created_by` en vez del id real de la organización, arrastrado desde antes del fix de `App.tsx` del 27 jul (`d82cc6c`). Al menos una fila del 4 ago (una semana después de ese fix, ya confirmado desplegado) seguía con el mismo bug sin que el código actual tenga un camino que lo explique — probable bundle cacheado viejo o acceso vía el proyecto Vercel deprecado (`frontend-eta-five-50.vercel.app`), sin confirmar aún
- Migración `20260810183024_layouts_fix_org_id_and_scope_by_org.sql`: backfill de los 43 `org_id` desde la membership activa real de cada creador; RLS reemplazada de ownership por creador (`created_by = auth.uid()`) a membership por organización (decisión de producto: los planos son compartidos por org, no privados por creador); trigger `layouts_set_org_id()` que resuelve `org_id` del lado del servidor en cada insert/update, ignorando lo que mande el cliente
- Revisión de seguridad de esa migración encontró una vulnerabilidad real: al reemplazar la policy vieja se perdió sin querer el `WITH CHECK (created_by = auth.uid())` que tenía — cualquier miembro de una org podía spoofear `created_by` a cualquier otro usuario real vía INSERT o UPDATE directo. Confirmado explotable en producción antes del fix (impersonación real de usuario vía `set local request.jwt.claim.sub`)
- Migración `20260810185339_layouts_fix_created_by_spoofing.sql`: mismo criterio que `org_id` — `created_by` se pisa siempre con `auth.uid()` en INSERT y queda inmutable (`OLD.created_by`) en UPDATE, sin importar qué mande el cliente
- Ambas migraciones aplicadas directo contra producción vía `supabase db query --linked -f` (no `db push`, mismo criterio que `20260727193938` — ledger `schema_migrations` compartido entre repos) y verificadas empíricamente con impersonación real de tres usuarios de JBD Producciones: backfill sin mismatches (0 filas), RLS probada con jbambaren/clauz/tzuloaga viendo el mismo set de 43 layouts, trigger de `org_id` y gate de `approval_status` (org suspendida bloqueada) confirmados, y el ataque de spoofing de `created_by` re-testeado y bloqueado tras el fix, sin regresiones
- Ambos commits pusheados a `main`; deploy automático de Vercel confirmado `"state":"success"` vía `gh api .../status` y sitio en vivo con `last-modified` fresco (`x-vercel-cache: MISS`) — pese a ser solo migraciones SQL sin tocar `frontend/`

**Próximo paso:**
- Confirmar con claudialauzeli (org "Claudia Producciones") si accedió por `rn-layout-engine.vercel.app` (URL canónica) o por la deprecada `frontend-eta-five-50.vercel.app`, para descartar el proyecto viejo como causa de la fila corrupta del 4 ago
- Mismos pendientes de sesiones anteriores (migración de duplicación sin ejecutar, office testing general)
