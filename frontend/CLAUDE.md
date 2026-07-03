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
- Validar con datos reales en producción (evento real en `eventos-eventos-frontend`, no solo mocks) — ver NEXT PRIORITIES #1b en `docs/SYSTEM_STATE.md`
- Mismos pendientes de sesiones anteriores (migración de duplicación sin ejecutar, office testing general)

### Sesión 2026-07-03 (continuación) — SESSION-0020: diagnóstico del auto-link roto en producción
**Contexto:** el fix de SESSION-0019 (`eeae250`/`d4f4464`) no funcionó en producción — se crearon 2 layouts nuevos para un evento sin layout previo y ninguno se auto-vinculó, incluido el primero (que según el diseño debía auto-vincularse).

**Completado (solo diagnóstico, sin aplicar fix todavía):**
- Descartado por evidencia directa: el deploy de producción SÍ incluye el código del fix (`curl` al bundle JS servido en `rn-layout-engine.vercel.app`, confirmado string `auto-link` y dos llamadas `.schema("eventos")` presentes)
- Descartado (parcialmente, sin JWT de usuario real): acceso al schema `eventos` vía Data API funciona a nivel de esquema/columna — `GET eventos.events?select=id,layout_id` con la anon key devuelve `200 []` (respuesta válida, no error de "schema/columna no encontrada"), lo que sugiere que el schema cache de PostgREST sí reconoce `eventos.events.layout_id`. No descarta RLS bloqueando para un usuario autenticado real, solo descarta que el problema sea "schema no expuesto" o "columna no cacheada"
- Instrumentado `layoutService.ts` con logging temporal `[auto-link]` (prefijo consistente): loguea el disparo del intento (event_id + nuevo layout_id), el valor de `eventos.events.layout_id` devuelto por `getEventLayoutId`, y el resultado del UPDATE — `linkEventLayout` ahora encadena `.select('id, layout_id').maybeSingle()` (antes no seleccionaba nada) específicamente para poder distinguir un UPDATE que sí afectó una fila de uno bloqueado silenciosamente por RLS (0 filas, sin error — comportamiento normal de Postgres/PostgREST, no un bug de Supabase)
- Hallazgo secundario, NO confirmado como causa raíz de este bug específico (los layouts sí llegaron con `event_id` seteado, así que el usuario ya estaba autenticado cuando guardó): `App.tsx` `handleLogin()` llama `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })` — `window.location.origin` descarta el query string. Si un usuario NO autenticado llega a `/?event_id=X` y hace login recién ahí, vuelve a `/` sin `event_id` tras el OAuth roundtrip. Vale la pena revisarlo aparte, pero no es la causa de este reporte (los `event_id` de ambos layouts sí llegaron a `layouts.event_id`, confirmado porque aparecen en la lista del tab Layout)
- Documentado bug aparte no relacionado: `get_event_summary` (ver sección "Known Bugs" arriba)

**Pendiente — bloqueado por falta de credenciales de usuario real:**
- El agente no tiene login real (Google OAuth), ni service-role key, ni Supabase CLI vinculado en este entorno — no puede reproducir el flujo completo end-to-end contra producción por su cuenta, solo diagnosticar por inspección de código + bundle + llamadas anónimas de solo lectura
- Falta capturar los logs `[auto-link]` reales de un guardado real (requiere que un usuario autenticado con membresía de org real reproduzca: crear evento de prueba sin layout → "Crear layout" → "Nuevo layout" → "Guardar" → copiar consola)
- Hipótesis principal a confirmar con esos logs: el UPDATE a `eventos.events` se ejecuta sin lanzar error pero afecta 0 filas (bloqueado silenciosamente por la policy RLS `members can access org events`, que depende de que `auth.uid()` del usuario esté en `organization_members` con el mismo `org_id` que el evento) — Postgres/PostgREST no distinguen "0 filas por RLS" de "0 filas porque no existía la fila"; ambos devuelven éxito sin error si no se encadena `.select()`, que es exactamente lo que el código original (SESSION-0019) no hacía
