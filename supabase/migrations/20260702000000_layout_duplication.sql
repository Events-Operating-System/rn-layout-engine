-- Layout duplication support (fork). Schema left ready for real versioning
-- (v1 -> v2 chained under the same parent_layout_id with an "active version"
-- concept) in a future, separate batch — no data migration should be needed
-- when that lands.
--
-- parent_layout_id: points to the layout this row was forked from. NULL for
--   originals. ON DELETE SET NULL so deleting/archiving a parent never blocks
--   or cascades into its forks.
-- version_number: reserved for future versioning. Every fork created by this
--   batch is version_number = 1 (a new independent lineage root), NOT an
--   incremented version of its parent.
--
-- NOTE: the version_number type in the original spec ("IL") was a typo —
-- using INTEGER here.

ALTER TABLE layouts
  ADD COLUMN IF NOT EXISTS parent_layout_id UUID REFERENCES layouts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_layouts_parent_layout_id ON layouts(parent_layout_id);

-- ── RLS check ──────────────────────────────────────────────────────────────
-- Existing RLS policies on `layouts` apply per-row (USING / WITH CHECK
-- expressions evaluate against the whole row), so adding two new nullable
-- columns does NOT require a new policy — this is standard Postgres RLS
-- behavior, not something specific to this table. Run this to confirm the
-- current policies don't do anything unusual (e.g. explicit column lists in
-- `qual`, which would be atypical):
--
--   SELECT policyname, cmd, qual, with_check
--   FROM pg_policies
--   WHERE tablename = 'layouts';
--
-- Expected: policies key off org_id / created_by / auth.uid(), with no
-- column-specific logic. If that holds, no new policy is needed.
