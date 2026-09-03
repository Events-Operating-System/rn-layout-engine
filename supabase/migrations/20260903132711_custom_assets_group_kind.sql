-- ============================================================
-- RN Layout Engine — "Mis Assets": tipo compuesto (grupo de piezas)
--
-- Contexto: hoy custom_assets es una fila = una primitiva con
-- dimensiones fijas. Se quiere poder seleccionar varios elementos del
-- canvas y guardarlos como un solo asset reutilizable.
--
-- Diseño (confirmado con Javier):
--   - kind = 'shape' (default) | 'group'. Los 12 assets existentes pasan
--     a 'shape' con el backfill del DEFAULT — no cambia nada para ellos.
--   - Un asset kind = 'group' guarda children: array de piezas con
--     posición relativa al origen del grupo (top-left del bounding box
--     combinado). default_width/default_height del asset = dimensiones de
--     ese bounding box, solo para el badge de la librería.
--   - Al re-agregar un grupo se expande a N elementos independientes
--     (ids nuevos), sin ningún concepto de "grupo persistente" en el
--     estado del canvas: una vez colocados son elementos comunes.
--
-- Forma de cada child (jsonb):
--   { name, category, shape?, dx, dy, width, height, rotation, color,
--     opacity?, flipX?, flipY?, notes?, points? }
--   dx/dy en metros desde el origen del grupo. Se extendió más allá del
--   set mínimo { shape, dx, dy, width, height, rotation, color, points }
--   porque LayoutElement.category es obligatorio y sin name/opacity/
--   flip/notes las piezas re-agregadas perderían esos datos. Sin
--   validación de forma en la DB (mismo criterio que elements/drawings
--   de public.layouts, que también son jsonb sin schema).
--
-- La tabla public.custom_assets se creó ad hoc en Studio (sin migración
-- previa). RLS actual: única policy FOR ALL con created_by = auth.uid()
-- (USING + WITH CHECK), sin trigger. Agregar dos columnas nullable /
-- con default NO requiere tocar esa policy — evalúa la fila entera, sin
-- lista de columnas (mismo razonamiento que 20260702000000 para
-- layouts y 20260903125134 para custom_assets.points).
--
-- Aplicar vía `supabase db query --linked -f` seguido de
-- `supabase migration repair --status applied 20260903132711`
-- (NUNCA `db push`) — ledger schema_migrations compartido entre repos.
-- ============================================================

alter table public.custom_assets
  add column if not exists kind text not null default 'shape'
    check (kind in ('shape', 'group')),
  add column if not exists children jsonb;
