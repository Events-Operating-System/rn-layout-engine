-- ============================================================
-- RN Layout Engine — Numeración automática de versiones + historial
--
-- Decisión (Javier, 2026-10-31):
--   - Cada "Guardar" manual que cambia el plano suma 1 a
--     layouts.version_number. Lo cuenta la base (trigger), no el cliente.
--     Guardar sin cambios, el autosave (layout_drafts) y cambios que no son
--     del plano (viewport, event_id, is_archived) NO suman.
--   - Cada versión guarda una foto del plano en public.layout_versions
--     (número, fecha, quién guardó, contenido). Solo la escribe el trigger;
--     el cliente solo puede leerla (no hay insert/update/delete para
--     authenticated → el historial es inmutable).
--   - Restaurar = public.restore_layout_version(): copia el contenido de
--     una versión vieja a la fila real → el trigger crea una versión NUEVA
--     (N+1). No borra las siguientes.
--   - Duplicar sigue igual: un fork nace en v1 con su propio historial.
--   - Los layouts existentes arrancan en v1 (version_number ya es 1 en las
--     92 filas); se les crea la foto v1 con su contenido actual. El texto a
--     mano de meta.version queda intacto (el frontend lo muestra como nota).
--
-- Aplicar: `supabase db query --linked -f <este archivo>` + verificación
-- directa (ledger schema_migrations compartido entre repos, nunca db push).
-- ============================================================

-- ── Tabla de versiones ──────────────────────────────────────────────────
create table if not exists public.layout_versions (
  id              uuid primary key default gen_random_uuid(),
  layout_id       uuid not null references public.layouts(id) on delete cascade,
  org_id          uuid not null,
  version_number  integer not null,
  name            text not null,
  elements        jsonb not null default '[]'::jsonb,
  drawings        jsonb not null default '[]'::jsonb,
  meta            jsonb not null default '{}'::jsonb,
  viewport        jsonb not null default '{"x": 0, "y": 0, "scale": 1}'::jsonb,
  created_at      timestamptz not null default now(),
  created_by      uuid,
  -- Nombre de quien guardó, copiado al momento de guardar: user_profiles
  -- solo deja leer el propio registro, así que el panel no podría
  -- resolverlo después para otros miembros.
  created_by_name text,
  restored_from   integer,
  unique (layout_id, version_number)
);

create index if not exists idx_layout_versions_org_id on public.layout_versions(org_id);

revoke all on public.layout_versions from anon, authenticated;
grant select on public.layout_versions to authenticated;
grant all on public.layout_versions to service_role;

alter table public.layout_versions enable row level security;

drop policy if exists "layout_versions: org member select" on public.layout_versions;
create policy "layout_versions: org member select" on public.layout_versions
  for select
  using (org_id in (select public.my_active_org_ids()));

-- ── BEFORE: el número lo decide la base ─────────────────────────────────
create or replace function public.layouts_version_number()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.version_number := 1;
  elsif new.elements is distinct from old.elements
     or new.drawings is distinct from old.drawings
     or new.meta     is distinct from old.meta
     or new.name     is distinct from old.name then
    new.version_number := coalesce(old.version_number, 0) + 1;
  else
    new.version_number := old.version_number;
  end if;
  return new;
end;
$$;

drop trigger if exists layouts_version_number_trigger on public.layouts;
create trigger layouts_version_number_trigger
  before insert or update on public.layouts
  for each row execute function public.layouts_version_number();

-- ── AFTER: foto de cada versión nueva ───────────────────────────────────
create or replace function public.layouts_snapshot_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_restored text;
begin
  if tg_op = 'UPDATE' and new.version_number is not distinct from old.version_number then
    return null;
  end if;

  v_restored := nullif(current_setting('layouts.restored_from', true), '');

  insert into public.layout_versions (
    layout_id, org_id, version_number, name, elements, drawings, meta, viewport,
    created_by, created_by_name, restored_from
  )
  values (
    new.id, new.org_id, new.version_number, coalesce(new.name, ''),
    coalesce(new.elements, '[]'::jsonb), coalesce(new.drawings, '[]'::jsonb),
    coalesce(new.meta, '{}'::jsonb), coalesce(new.viewport, '{"x": 0, "y": 0, "scale": 1}'::jsonb),
    auth.uid(),
    (select coalesce(nullif(full_name, ''), email) from public.user_profiles where id = auth.uid()),
    v_restored::integer
  )
  on conflict (layout_id, version_number) do nothing;

  return null;
end;
$$;

drop trigger if exists layouts_snapshot_version_trigger on public.layouts;
create trigger layouts_snapshot_version_trigger
  after insert or update on public.layouts
  for each row execute function public.layouts_snapshot_version();

-- ── Restaurar: crea versión nueva con el contenido de una vieja ─────────
-- security invoker: el UPDATE pasa por la RLS normal de layouts (miembro de
-- la org activa + org aprobada) y por los triggers de org_id/created_by.
create or replace function public.restore_layout_version(p_layout_id uuid, p_version integer)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v public.layout_versions%rowtype;
  v_new integer;
begin
  select * into v from public.layout_versions
  where layout_id = p_layout_id and version_number = p_version;
  if not found then
    raise exception 'No existe la versión % de este layout', p_version;
  end if;

  perform set_config('layouts.restored_from', p_version::text, true);

  update public.layouts
     set name = v.name, elements = v.elements, drawings = v.drawings,
         meta = v.meta, viewport = v.viewport
   where id = p_layout_id
  returning version_number into v_new;

  perform set_config('layouts.restored_from', '', true);

  if v_new is null then
    raise exception 'No tienes permiso para editar este layout';
  end if;
  return v_new;
end;
$$;

revoke all on function public.restore_layout_version(uuid, integer) from public, anon;
grant execute on function public.restore_layout_version(uuid, integer) to authenticated;

-- ── Backfill: foto v1 de los layouts existentes ─────────────────────────
insert into public.layout_versions (
  layout_id, org_id, version_number, name, elements, drawings, meta, viewport,
  created_at, created_by, created_by_name
)
select l.id, l.org_id, coalesce(l.version_number, 1), coalesce(l.name, ''),
       coalesce(l.elements, '[]'::jsonb), coalesce(l.drawings, '[]'::jsonb),
       coalesce(l.meta, '{}'::jsonb), coalesce(l.viewport, '{"x": 0, "y": 0, "scale": 1}'::jsonb),
       l.updated_at, l.created_by,
       (select coalesce(nullif(up.full_name, ''), up.email) from public.user_profiles up where up.id = l.created_by)
from public.layouts l
where l.org_id is not null
on conflict (layout_id, version_number) do nothing;
