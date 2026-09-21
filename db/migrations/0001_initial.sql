BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE project_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE project_visibility AS ENUM ('PUBLIC', 'PRIVATE');
CREATE TYPE block_type AS ENUM ('HERO', 'TEXT', 'IMAGE', 'VIDEO', 'GRID', 'GALLERY', 'SPACER');
CREATE TYPE media_type AS ENUM ('IMAGE', 'VIDEO', 'EXTERNAL_VIDEO');
CREATE TYPE media_status AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'FAILED');

CREATE TABLE admin_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email varchar(320) NOT NULL,
    password_hash text NOT NULL,
    name varchar(200),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    last_login_at timestamptz
);

CREATE UNIQUE INDEX admin_users_email_uidx ON admin_users (email);

CREATE TABLE media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type media_type NOT NULL,
    status media_status NOT NULL DEFAULT 'UPLOADING',

    storage_provider varchar(100),
    storage_key text,
    url text,
    thumbnail_url text,

    external_provider varchar(100),
    external_url text,

    filename text,
    original_filename text,
    mime_type varchar(255),

    width integer,
    height integer,
    duration_ms integer,
    file_size_bytes bigint,

    alt_text text,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,

    CONSTRAINT media_dimensions_positive_check CHECK (
        (width IS NULL OR width > 0)
        AND (height IS NULL OR height > 0)
    ),
    CONSTRAINT media_duration_nonnegative_check CHECK (
        duration_ms IS NULL OR duration_ms >= 0
    ),
    CONSTRAINT media_file_size_nonnegative_check CHECK (
        file_size_bytes IS NULL OR file_size_bytes >= 0
    )
);

CREATE INDEX media_type_idx ON media (type);
CREATE INDEX media_status_idx ON media (status);
CREATE INDEX media_created_at_idx ON media (created_at);

CREATE TABLE projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    title varchar(200) NOT NULL,
    slug varchar(200) NOT NULL,

    short_description varchar(500),
    description text,

    year integer,
    category varchar(120),
    client varchar(200),

    credits jsonb NOT NULL DEFAULT '[]'::jsonb,

    status project_status NOT NULL DEFAULT 'DRAFT',
    visibility project_visibility NOT NULL DEFAULT 'PUBLIC',
    password_hash text,

    cover_media_id uuid REFERENCES media(id) ON DELETE SET NULL,

    is_featured boolean NOT NULL DEFAULT false,
    featured_position integer,
    display_position integer NOT NULL DEFAULT 0,

    seo_title varchar(200),
    seo_description varchar(500),

    published_at timestamptz,

    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,

    CONSTRAINT projects_private_password_check CHECK (
        visibility <> 'PRIVATE' OR password_hash IS NOT NULL
    ),
    CONSTRAINT projects_year_range_check CHECK (
        year IS NULL OR (year >= 1900 AND year <= 2100)
    ),
    CONSTRAINT projects_display_position_nonnegative_check CHECK (
        display_position >= 0
    ),
    CONSTRAINT projects_featured_position_nonnegative_check CHECK (
        featured_position IS NULL OR featured_position >= 0
    )
);

CREATE UNIQUE INDEX projects_slug_uidx ON projects (slug);
CREATE INDEX projects_status_idx ON projects (status);
CREATE INDEX projects_visibility_idx ON projects (visibility);
CREATE INDEX projects_public_order_idx ON projects (status, deleted_at, display_position);
CREATE INDEX projects_featured_order_idx ON projects (is_featured, featured_position);

CREATE TABLE project_blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type block_type NOT NULL,
    position integer NOT NULL,
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT project_blocks_position_nonnegative_check CHECK (position >= 0)
);

CREATE INDEX project_blocks_project_id_idx ON project_blocks (project_id);
CREATE INDEX project_blocks_project_position_idx ON project_blocks (project_id, position);

CREATE TABLE block_media (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id uuid NOT NULL REFERENCES project_blocks(id) ON DELETE CASCADE,
    media_id uuid NOT NULL REFERENCES media(id) ON DELETE RESTRICT,
    position integer NOT NULL,
    config jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT block_media_position_nonnegative_check CHECK (position >= 0)
);

CREATE INDEX block_media_block_id_idx ON block_media (block_id);
CREATE INDEX block_media_block_position_idx ON block_media (block_id, position);
CREATE INDEX block_media_media_id_idx ON block_media (media_id);

COMMIT;
