-- ============================================================
-- RN Layout Engine — Autosave de layouts vía tabla layout_drafts
--
-- Contexto: el editor mantiene todo el estado (elements/drawings/meta/
-- viewport) solo en memoria de React. No hay autosave, ni guarda de
-- visibilitychange/pagehide, ni tracking de "dirty". Cerrar la pestaña,
-- recargar, o volver al dashboard antes de apretar "Guardar" pierde todo
-- el avance en silencio. Mismo problema ya resuelto en
-- eventos-ventas-frontend (quote_document_drafts) y eventos-eventos-
-- frontend (event_document_drafts).
--
-- Diseño (confirmado con Javier):
--   - Tabla SEPARADA, 1 fila por layout (pk = layout_id). El autosave con
--     debounce (~6s de inactividad, flush forzado a los 30s y en
--     pagehide/visibilitychange/desmonte) escribe SOLO acá. NUNCA toca
--     public.layouts — esa fila la sigue pisando únicamente el botón
--     "Guardar" manual, sin cambio de comportamiento.
--   - El draft se borra cuando "Guardar" manual persiste la fila real.
--   - Al abrir un layout, si existe un draft con updated_at > el
--     updated_at de la fila real (que se mantiene por el trigger
--     layouts_updated_at), el frontend muestra un banner de recuperación.
--   - Draft compartido por organización, sin scoping por usuario — mismo
--     modelo que quote_document_drafts / event_document_drafts. Si dos
--     miembros editan el mismo layout, gana el último autosave.
--
-- GAP CONOCIDO (no se resuelve en este batch, decisión de producto): un
-- layout que todavía no se guardó nunca a mano no tiene fila en
-- public.layouts, así que el FK de abajo impide tener un draft. El
-- autosave se activa recién tras el primer "Guardar" manual. La ventana
-- pre-primer-guardado queda sin cubrir a propósito.
--
-- org_id y updated_by NO se confían al cliente: un trigger BEFORE
-- INSERT/UPDATE los resuelve server-side (org_id se hereda de la fila
-- public.layouts referenciada; updated_by = auth.uid()). Mismo criterio
-- que layouts_set_org_id() (20260810183024 / 20260810185339): nunca
-- confiar en lo que manda el frontend para estos campos.
--
-- Nombrado con timestamp (no numeración secuencial): el ledger
-- supabase_migrations.schema_migrations de este proyecto Supabase es
-- compartido entre repos. Aplicar vía `supabase db query --linked -f`
-- seguido de `supabase migration repair --status applied 20260903125133`
-- (NUNCA `db push`).
-- ============================================================

create table if not exists public.layout_drafts (
  layout_id   uuid primary key references public.layouts(id) on delete cascade,
  org_id      uuid not null,
  elements    jsonb not null default '[]'::jsonb,
  drawings    jsonb not null default '[]'::jsonb,
  meta        jsonb not null default '{}'::jsonb,
  viewport    jsonb not null default '{"x": 0, "y": 0, "scale": 1}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid
);

create index if not exists idx_layout_drafts_org_id on public.layout_drafts(org_id);

-- Tabla nueva creada por migración (no ad hoc en Studio) — hay que
-- otorgar los privilegios de tabla explícitamente. anon queda afuera: un
-- draft siempre pertenece a un usuario autenticado (y la RLS de abajo lo
-- bloquearía igual, porque auth.uid() es null para anon).
grant select, insert, update, delete on public.layout_drafts to authenticated;
grant all on public.layout_drafts to service_role;

-- ── updated_at automático (reusa el helper compartido que ya usa layouts
--    vía el trigger layouts_updated_at) ──────────────────────────────────
drop trigger if exists layout_drafts_updated_at on public.layout_drafts;
create trigger layout_drafts_updated_at
  before update on public.layout_drafts
  for each row execute function public.update_updated_at();

-- ── org_id (heredado de la fila layouts) + updated_by, server-side ──────
create or replace function public.layout_drafts_set_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  select org_id into v_org_id from public.layouts where id = new.layout_id;
  if v_org_id is null then
    raise exception 'layout_drafts: no existe el layout % — no se puede crear/actualizar el draft', new.layout_id;
  end if;
  new.org_id := v_org_id;
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists layout_drafts_set_fields_trigger on public.layout_drafts;
create trigger layout_drafts_set_fields_trigger
  before insert or update on public.layout_drafts
  for each row execute function public.layout_drafts_set_fields();

-- ── RLS: mismo modelo que public.layouts (membership por organización
--    activa vía my_active_org_ids(), + approval_status = 'active' para
--    escritura) ──────────────────────────────────────────────────────────
alter table public.layout_drafts enable row level security;

drop policy if exists "layout_drafts: org member select" on public.layout_drafts;
create policy "layout_drafts: org member select" on public.layout_drafts
  for select
  using (org_id in (select public.my_active_org_ids()));

drop policy if exists "layout_drafts: org member write" on public.layout_drafts;
create policy "layout_drafts: org member write" on public.layout_drafts
  for all
  using (
    org_id in (select public.my_active_org_ids())
    and exists (
      select 1 from public.organizations
      where id = layout_drafts.org_id and approval_status = 'active'
    )
  )
  with check (
    org_id in (select public.my_active_org_ids())
    and exists (
      select 1 from public.organizations
      where id = layout_drafts.org_id and approval_status = 'active'
    )
  );
