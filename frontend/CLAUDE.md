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
- Columna event_id agregada a tabla layouts en Supabase
- App.tsx lee ?event_id de la URL al montar y lo propaga
- LayoutDashboard.tsx muestra banner cuando hay event_id en URL
- layoutService.ts: save() acepta event_id opcional en INSERT/UPDATE
- Nuevo setEventId() para vincular layouts existentes a un evento
- useLayoutPersistence.ts y LayoutEditor.tsx hilan eventId hasta save()
- Verificado en producción: layout "Patrick prueba" guardado con
  event_id correcto en Supabase
- Sin event_id en URL el comportamiento es exactamente igual al actual

**Próximo paso:**
- Sesión dedicada a fixes de Layout Engine (lista pendiente con Javier)
- Mostrar layouts vinculados al evento en tab Layout del expediente
