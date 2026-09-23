-- Seeds the HOME page row (ADR-0007): Home must exist before it can be composed.
-- Idempotent, and it never overwrites an existing row.
INSERT INTO "pages" ("key", "title") VALUES ('HOME', 'Home') ON CONFLICT ("key") DO NOTHING;
