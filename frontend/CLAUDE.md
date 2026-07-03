@AGENTS.md

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
