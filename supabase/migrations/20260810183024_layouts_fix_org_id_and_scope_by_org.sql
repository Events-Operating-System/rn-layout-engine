-- ============================================================
-- RN Layout Engine — Corregir org_id y pasar layouts de ownership
-- por usuario a membership por organización
--
-- Contexto: auditoría de datos confirmó que public.layouts.org_id está
-- mal poblado en el 100% de las filas existentes (43/43) — quedó igual
-- a created_by en vez del id real de la organización, arrastrado desde
-- antes del fix de frontend/src/App.tsx del 27 jul (d82cc6c, ver
-- 20260727193938_layouts_restrict_writes_to_active_orgs.sql). Peor: hay
-- al menos una fila del 4 ago (una semana después de ese fix, ya
-- confirmado desplegado en producción) que sigue teniendo el mismo bug,
-- sin que el código actual de layoutService.ts/App.tsx tenga ningún
-- camino que lo explique — probable bundle cacheado viejo o acceso vía
-- el proyecto Vercel deprecado (frontend-eta-five-50.vercel.app, ver
-- docs/DEPLOYMENT.md). Conclusión: no alcanza con que el frontend
-- calcule bien el org_id, hay que dejar de confiar en lo que manda el
-- cliente.
--
-- Decisión de producto: los planos son compartidos por organización,
-- no privados por creador (cambia el modelo de RLS anterior, que era
-- ownership puro por created_by = auth.uid()).
--
-- Verificación de seguridad hecha antes de este backfill: ningún
-- usuario tiene más de una organización activa (0 filas en
-- `select user_id, count(*) from public.organization_members
--  where is_active = true group by user_id having count(*) > 1`),
-- así que el join por user_id + is_active abajo es no ambiguo.
--
-- Tres cambios:
--   1. Backfill de los org_id existentes, tomados de la membership
--      activa real de cada creador.
--   2. RLS: reemplaza las policies "owner select"/"owner write" de
--      20260727193938 por membership de organización (mismo patrón
--      my_active_org_ids() que usa el resto de los módulos), en vez de
--      created_by = auth.uid().
--   3. Trigger que resuelve org_id del lado del servidor en cada
--      insert/update, ignorando lo que mande el cliente — esto cierra
--      el bug de raíz, no solo el síntoma. Mismo principio que ya usan
--      registrar_seguimiento/crear_cliente_y_oportunidad: nunca confiar
--      en un org_id que venga del frontend. No hace falta tocar
--      layoutService.ts — el trigger pisa cualquier org_id que mande el
--      cliente.
--
-- Nombrado con timestamp (no numeración secuencial), mismo criterio que
-- 20260727193938: el ledger supabase_migrations.schema_migrations de
-- este proyecto Supabase es compartido entre repos. Aplicar vía
-- `supabase db query --linked -f` (no `db push`) para no chocar con ese
-- ledger ni tocarlo.
-- ============================================================

-- 1. Backfill: org_id existente -> org_id real de la membership activa
--    del creador de cada layout.
update public.layouts l
set org_id = om.org_id
from public.organization_members om
where l.created_by = om.user_id
  and om.is_active = true
  and l.org_id is distinct from om.org_id;

-- 2. RLS: ownership por usuario -> membership por organización.
drop policy if exists "layouts: owner select" on public.layouts;
drop policy if exists "layouts: owner write" on public.layouts;

create policy "layouts: org member select" on public.layouts
  for select
  using (org_id in (select public.my_active_org_ids()));

create policy "layouts: org member write" on public.layouts
  for all
  using (
    org_id in (select public.my_active_org_ids())
    and exists (
      select 1 from public.organizations
      where id = layouts.org_id and approval_status = 'active'
    )
  )
  with check (
    org_id in (select public.my_active_org_ids())
    and exists (
      select 1 from public.organizations
      where id = layouts.org_id and approval_status = 'active'
    )
  );

-- 3. Trigger: resuelve org_id del lado del servidor, ignorando lo que
--    mande el cliente.
create or replace function public.layouts_set_org_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select org_id into v_org_id
  from public.organization_members
  where user_id = auth.uid() and is_active = true
  limit 1;

  if v_org_id is null then
    raise exception 'No se encontró una organización activa para el usuario actual — no se puede crear/editar el layout.';
  end if;

  new.org_id := v_org_id;
  new.created_by := coalesce(new.created_by, auth.uid());
  return new;
end;
$$;

drop trigger if exists layouts_set_org_id_trigger on public.layouts;
create trigger layouts_set_org_id_trigger
  before insert or update on public.layouts
  for each row
  execute function public.layouts_set_org_id();
