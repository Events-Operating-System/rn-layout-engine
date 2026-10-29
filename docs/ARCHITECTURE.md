Write ONLY docs/ARCHITECTURE.md.

Do not write any other file.

The architecture must remain:
- modular
- operational
- scalable
- AI-native
- startup-friendly

Important constraints:

- This is NOT enterprise overengineering.
- Avoid microservices complexity.
- Avoid Kubernetes.
- Avoid CQRS.
- Avoid distributed systems complexity.
- Avoid unnecessary abstractions.

Architecture should focus on:

- Frontend layer
- Backend layer
- Layout engine core
- Asset system
- Metadata system
- Spatial object model
- Storage architecture
- Export pipeline
- Future 3D readiness
- EventOS ecosystem integration

Current stack:

Frontend:
- Vite 6 (migrated from Next.js in SESSION-0009 — do not reintroduce Next.js)
- React 19
- TypeScript 5
- Tailwind v4 (via @tailwindcss/vite — no PostCSS config)
- Konva.js / react-konva (2D canvas — NOT Three.js)

Backend:
- Node.js
- Express
- MongoDB Atlas

Storage:
- Cloudflare R2

Deployment:
- Frontend → Vercel
- Backend → Render

The document should explain:
- system boundaries
- module responsibilities
- future extensibility
- operational simplicity
- AI-readable architecture

Focus on clarity over complexity.

## Ajustes de la organización: un solo lugar (regla, 2026-10-29)

**Ajustes nuevos de la org → `organizations.settings.<módulo>`; nunca tablas nuevas de ajustes.**
- Los que usan varios módulos (moneda, monedas habilitadas, zona horaria, idioma, logo, firma, soporte) son columnas de
  `public.organizations`.
- Los de comportamiento de un solo módulo van en `organizations.settings.<grupo>.<clave>`, declarados en
  `public.org_settings_schema()` (tipo, valor por defecto y módulo que los edita). Se leen con
  `rpc('org_settings', { p_org_id })` (cada clave o su valor por defecto) y se escriben con
  `rpc('set_org_settings', { p_org_id, p_group, p_values })`, que valida claves y tipos. Escribir `settings` directo está
  bloqueado por un trigger. Para un ajuste nuevo: agregar la clave a `org_settings_schema()` con una migración.
- Quién edita: las columnas, el logo y la firma, quien tiene el módulo Administración en Roles y permisos (Owner siempre,
  Viewer nunca; `public.can_edit_org_module(org, 'administrativo')`); `settings.<grupo>`, quien tiene el módulo de ese
  grupo. Aprobación, plan y cobro: solo superadmin. Todo en la base (RLS y funciones), no solo en pantalla.
- Detalle: `eventos-administracion-frontend/supabase/migrations/20261029150000_org_settings_single_place_and_admin_edit.sql`.


## Antes de hacer push de código que depende de una migración (regla fija, 2026-10-29)

1. Confirmar que estás en la carpeta de este repo y que el proyecto Supabase enlazado es **rn-layout-engine-v2**
   (ref `zwrekwltmipmdbautnwd`): `cat supabase/.temp/project-ref` o `supabase projects list` (el enlazado lleva ●).
   Si el repo no está enlazado, enlazarlo (`supabase link --project-ref zwrekwltmipmdbautnwd`) antes de seguir.
2. Aplicar la migración y verificar que quedó aplicada: `supabase migration list` si se aplicó con `db push`; si se
   aplicó con `supabase db query --linked -f <archivo>` (no pasa por el registro de migraciones), con una consulta
   directa de lo que crea (función en `pg_proc`, política en `pg_policies`, columna en `information_schema`, datos).
3. Recién después, push del código.

Si el paso 2 falla, no hacer push: avisar a Javier. Motivo: el 2026-10-29 salió código antes que su migración (el
comando se corrió desde una carpeta sin proyecto enlazado y no aplicó nada; ~2 minutos con funciones faltantes).
