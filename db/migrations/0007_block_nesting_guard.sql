-- One level of nesting, enforced by the database (ADR-0006, CLAUDE.md §13).
-- The check constraints already keep GRID and GALLERY out of any parent and
-- give every block exactly one owner; a check cannot look at another row, so
-- this trigger adds the rest: a child's parent is a top-level GRID. Moving a
-- block between containers (POST /blocks/{blockId}/move) is covered because
-- the trigger also fires when parent_block_id changes. Additive: existing
-- rows already satisfy it.
CREATE FUNCTION "project_blocks_parent_is_root_grid"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."parent_block_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "project_blocks" AS parent
    WHERE parent."id" = NEW."parent_block_id"
      AND parent."type" = 'GRID'
      AND parent."parent_block_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'a nested block''s parent must be a top-level GRID'
      USING ERRCODE = 'check_violation', CONSTRAINT = 'project_blocks_parent_is_root_grid';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "project_blocks_parent_is_root_grid"
BEFORE INSERT OR UPDATE OF "parent_block_id", "type" ON "project_blocks"
FOR EACH ROW EXECUTE FUNCTION "project_blocks_parent_is_root_grid"();
