-- ============================================================
-- RN Layout Engine — Permisos por rol (bloque 1 de docs/AUDITORIA-LAYOUT.md)
--
-- Decisión (Javier, 2026-10-31): Layout se maneja en Administración →
-- Roles y permisos igual que los otros módulos (catálogo public.permissions
-- + public.role_permissions + public.role_can, migración
-- eventos-administracion-frontend/20261011150000_role_permission_matrix).
--
--   ver     = el rol tiene el módulo 'layout' (role_module_permissions).
--   crear   = plano nuevo, Duplicar, Guardar como copia.
--   editar  = Guardar cambios, restaurar una versión, autoguardado.
--   borrar  = archivar (lo que hoy hace "Eliminar") o borrar la fila.
--
-- Owner siempre todo: está en default_roles y set_role_permissions no deja
-- limitarlo (PERM002). Los roles que hoy usan Layout (admin, production,
-- sales, coordinacion) conservan todo por defecto. Viewer queda en solo
-- lectura: no está en default_roles (y hoy ni siquiera tiene el módulo).
--
-- El candado está en la base: políticas RLS por acción en public.layouts y
-- public.layout_drafts, más un trigger que distingue editar de borrar dentro
-- de un mismo UPDATE (archivar es un UPDATE de is_archived). La lectura no
-- cambia (Eventos lee public.layouts para la pestaña Layout).
--
-- Aplicar: `supabase db query --linked -f <este archivo>` + verificación
-- directa (ledger compartido entre repos; nunca db push).
-- ============================================================

-- ── Catálogo: acciones de Layout ────────────────────────────────────────
insert into public.permissions (module_id, module_key, action, name, label, description, default_roles)
select m.id, m.name, a.action, m.name || '.' || a.action, a.label, a.description,
       array['owner', 'admin', 'production', 'sales', 'coordinacion']
from public.modules m
cross join (values
  ('crear',  'Crear',  'Crear planos nuevos, duplicar y guardar como copia'),
  ('editar', 'Editar', 'Guardar cambios en un plano y restaurar versiones'),
  ('borrar', 'Borrar', 'Archivar (eliminar) planos')
) as a(action, label, description)
where m.name = 'layout'
on conflict (name) do nothing;

-- ── ¿El que llama puede hacer esta acción en Layout? ────────────────────
-- Exige tener el módulo (ver) y la acción. Sin usuario (servidor) → sí,
-- igual que role_can.
create or replace function public.layout_can(p_org_id uuid, p_action text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.role_can(p_org_id, 'layout', 'ver')
     and public.role_can(p_org_id, 'layout', p_action);
$$;

revoke all on function public.layout_can(uuid, text) from public, anon;
grant execute on function public.layout_can(uuid, text) to authenticated, service_role;

-- ── RLS de public.layouts por acción ────────────────────────────────────
drop policy if exists "layouts: org member write" on public.layouts;
drop policy if exists "layouts: insert con permiso crear" on public.layouts;
drop policy if exists "layouts: update con permiso editar o borrar" on public.layouts;
drop policy if exists "layouts: delete con permiso borrar" on public.layouts;

create policy "layouts: insert con permiso crear" on public.layouts
  for insert
  with check (
    org_id in (select public.my_active_org_ids())
    and public.layout_can(org_id, 'crear')
  );

create policy "layouts: update con permiso editar o borrar" on public.layouts
  for update
  using (
    org_id in (select public.my_active_org_ids())
    and (public.layout_can(org_id, 'editar') or public.layout_can(org_id, 'borrar'))
  )
  with check (
    org_id in (select public.my_active_org_ids())
    and (public.layout_can(org_id, 'editar') or public.layout_can(org_id, 'borrar'))
  );

create policy "layouts: delete con permiso borrar" on public.layouts
  for delete
  using (
    org_id in (select public.my_active_org_ids())
    and public.layout_can(org_id, 'borrar')
  );

-- La aprobación de la org (approval_status = 'active') ya la exige
-- role_can para toda acción que no sea 'ver'.

-- ── Trigger: dentro de un UPDATE, archivar pide borrar y el resto editar ─
create or replace function public.layouts_check_action()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.is_archived is distinct from old.is_archived
     and not public.layout_can(old.org_id, 'borrar') then
    raise exception 'LAYOUT_PERM: no tienes permiso para borrar planos'
      using errcode = '42501';
  end if;

  if (new.name, new.elements, new.drawings, new.meta, new.viewport, new.event_id, new.parent_layout_id)
     is distinct from
     (old.name, old.elements, old.drawings, old.meta, old.viewport, old.event_id, old.parent_layout_id)
     and not public.layout_can(old.org_id, 'editar') then
    raise exception 'LAYOUT_PERM: no tienes permiso para editar planos'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists layouts_check_action_trigger on public.layouts;
create trigger layouts_check_action_trigger
  before update on public.layouts
  for each row execute function public.layouts_check_action();

-- ── Autoguardado: escribir borradores pide editar ───────────────────────
drop policy if exists "layout_drafts: org member write" on public.layout_drafts;
create policy "layout_drafts: org member write" on public.layout_drafts
  for all
  using (
    org_id in (select public.my_active_org_ids())
    and public.layout_can(org_id, 'editar')
  )
  with check (
    org_id in (select public.my_active_org_ids())
    and public.layout_can(org_id, 'editar')
  );
