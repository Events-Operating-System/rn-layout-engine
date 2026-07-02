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
