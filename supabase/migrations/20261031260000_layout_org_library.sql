-- ============================================================
-- RN Layout Engine — Biblioteca de la organización (bloque 6)
--
-- Decisión (Javier, 2026-10-31, §6.1 de docs/AUDITORIA-LAYOUT.md):
--   - La biblioteca es la de la organización. Los assets personales siguen
--     existiendo y cada uno se puede "compartir con la org".
--   - Publicar en la biblioteca de la org es una facultad nueva en Roles y
--     permisos: layout.compartir, owner y admin por defecto.
--   - Plantillas de plano por organización (kind = 'template', el contenido
--     del plano en `payload`).
--   - Se cierra el riesgo anotado de custom_assets: created_by y org_id los
--     pone la base, no el cliente.
--
-- Compartir / sacar de la org: public.layout_set_asset_shared(id, shared).
--
-- Quién ve qué:
--   - Lo propio: siempre (personal o compartido).
--   - Lo compartido de la org: los miembros con el módulo Layout (ver).
-- Quién escribe:
--   - Crear: "editar" en Layout, en una org propia. Crear ya compartido pide
--     además "compartir".
--   - Cambiar lo propio: "editar". Compartir o dejar de compartir: "compartir".
--   - Quien tiene "compartir" puede sacar de la org (o borrar) un asset
--     compartido de otro, pero no cambiar su contenido.
--
-- No toca org_settings_schema() (las capas son fijas, no ajustes).
--
-- Aplicar: `supabase db query --linked -f <este archivo>` + verificación
-- directa (ledger compartido entre repos; nunca db push).
-- ============================================================

begin;

-- ── Columnas ────────────────────────────────────────────────────────────
alter table public.custom_assets
  add column if not exists org_id uuid references public.organizations(id) on delete cascade,
  add column if not exists shared boolean not null default false,
  add column if not exists shared_by uuid references auth.users(id) on delete set null,
  add column if not exists shared_at timestamptz,
  add column if not exists payload jsonb;

-- Assets existentes: a la org de su creador (hoy cada creador tiene una sola
-- membresía; si tuviera varias, la más antigua). Quedan personales.
update public.custom_assets a
set org_id = (
  select m.org_id from public.organization_members m
  where m.user_id = a.created_by
  order by m.is_active desc, m.joined_at asc nulls last
  limit 1
)
where a.org_id is null;

do $$
begin
  if exists (select 1 from public.custom_assets where org_id is null) then
    raise exception 'custom_assets sin org después del backfill';
  end if;
end $$;

alter table public.custom_assets alter column org_id set not null;

alter table public.custom_assets drop constraint if exists custom_assets_kind_check;
alter table public.custom_assets add constraint custom_assets_kind_check
  check (kind in ('shape', 'group', 'template'));

create index if not exists custom_assets_org_shared_idx on public.custom_assets (org_id) where shared;
create index if not exists custom_assets_created_by_idx on public.custom_assets (created_by);

-- ── Facultad nueva: layout.compartir ────────────────────────────────────
insert into public.permissions (module_id, module_key, action, name, label, description, default_roles)
select m.id, m.name, 'compartir', m.name || '.compartir', 'Compartir',
       'Publicar assets y plantillas en la biblioteca de la organización, o sacarlos',
       array['owner', 'admin']
from public.modules m
where m.name = 'layout'
on conflict (name) do nothing;

-- ── Trigger: created_by / org_id del lado del servidor ──────────────────
create or replace function public.custom_assets_set_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.created_by := auth.uid();
    end if;
    -- Clientes viejos no mandan la org: la del usuario (la RLS la valida).
    if new.org_id is null then
      select m.org_id into new.org_id
      from public.organization_members m
      where m.user_id = new.created_by and m.is_active
      order by m.joined_at asc nulls last
      limit 1;
    end if;
    if new.shared then
      new.shared_by := coalesce(auth.uid(), new.shared_by);
      new.shared_at := now();
    else
      new.shared_by := null;
      new.shared_at := null;
    end if;
    return new;
  end if;

  -- UPDATE
  new.created_by := old.created_by;
  new.org_id := old.org_id;

  if auth.uid() is not null
     and auth.uid() is distinct from old.created_by
     and (new.name, new.category, new.kind, new.default_width, new.default_height,
          new.default_color, new.shape, new.points, new.children, new.payload)
         is distinct from
         (old.name, old.category, old.kind, old.default_width, old.default_height,
          old.default_color, old.shape, old.points, old.children, old.payload) then
    raise exception 'LAYOUT_PERM: solo quien creó el asset puede cambiarlo'
      using errcode = '42501';
  end if;

  if new.shared is distinct from old.shared then
    if auth.uid() is not null and not public.layout_can(old.org_id, 'compartir') then
      raise exception 'LAYOUT_PERM: no tienes permiso para compartir en la biblioteca de la org'
        using errcode = '42501';
    end if;
    if new.shared then
      new.shared_by := coalesce(auth.uid(), old.shared_by);
      new.shared_at := now();
    else
      new.shared_by := null;
      new.shared_at := null;
    end if;
  else
    new.shared_by := old.shared_by;
    new.shared_at := old.shared_at;
  end if;

  return new;
end;
$$;

drop trigger if exists custom_assets_set_fields_trigger on public.custom_assets;
create trigger custom_assets_set_fields_trigger
  before insert or update on public.custom_assets
  for each row execute function public.custom_assets_set_fields();

-- ── RLS ─────────────────────────────────────────────────────────────────
alter table public.custom_assets enable row level security;

drop policy if exists "custom_assets: owner access" on public.custom_assets;
drop policy if exists "custom_assets: leer propios y de la org" on public.custom_assets;
drop policy if exists "custom_assets: crear" on public.custom_assets;
drop policy if exists "custom_assets: cambiar" on public.custom_assets;
drop policy if exists "custom_assets: borrar" on public.custom_assets;

create policy "custom_assets: leer propios y de la org" on public.custom_assets
  for select
  using (
    created_by = auth.uid()
    or (
      shared
      and org_id in (select public.my_active_org_ids())
      and public.role_can(org_id, 'layout', 'ver')
    )
  );

create policy "custom_assets: crear" on public.custom_assets
  for insert
  with check (
    created_by = auth.uid()
    and org_id in (select public.my_active_org_ids())
    and public.layout_can(org_id, 'editar')
    and (not shared or public.layout_can(org_id, 'compartir'))
  );

-- Cambiar: solo lo propio. Compartir o sacar de la org va por
-- layout_set_asset_shared (abajo): un asset ajeno que se saca de la org deja
-- de ser visible para quien lo saca, y la RLS rechazaría ese UPDATE directo.
create policy "custom_assets: cambiar" on public.custom_assets
  for update
  using (
    created_by = auth.uid()
    and org_id in (select public.my_active_org_ids())
    and public.layout_can(org_id, 'editar')
  )
  with check (
    created_by = auth.uid()
    and org_id in (select public.my_active_org_ids())
    and public.layout_can(org_id, 'editar')
  );

create policy "custom_assets: borrar" on public.custom_assets
  for delete
  using (
    org_id in (select public.my_active_org_ids())
    and (
      (created_by = auth.uid() and not shared and public.layout_can(org_id, 'editar'))
      or (shared and public.layout_can(org_id, 'compartir'))
    )
  );

-- ── Compartir con la org o sacar de ella ────────────────────────────────
-- Compartir: solo lo propio. Sacar: cualquier asset compartido de la org.
-- Las dos piden "compartir" en Layout (lo vuelve a mirar el trigger).
create or replace function public.layout_set_asset_shared(p_id uuid, p_shared boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_owner uuid;
  v_shared boolean;
begin
  select org_id, created_by, shared into v_org, v_owner, v_shared
  from public.custom_assets where id = p_id;

  if v_org is null
     or v_org not in (select public.my_active_org_ids())
     or not public.layout_can(v_org, 'compartir')
     or (p_shared and v_owner is distinct from auth.uid())
     or (not p_shared and not v_shared and v_owner is distinct from auth.uid()) then
    raise exception 'LAYOUT_PERM: no tienes permiso para compartir en la biblioteca de la org'
      using errcode = '42501';
  end if;

  update public.custom_assets set shared = p_shared where id = p_id;
end;
$$;

revoke all on function public.layout_set_asset_shared(uuid, boolean) from public, anon;
grant execute on function public.layout_set_asset_shared(uuid, boolean) to authenticated, service_role;

commit;
