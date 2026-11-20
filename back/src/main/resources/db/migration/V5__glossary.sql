-- Glossary: categories, terms, related-term links, per-user favourites and language-level preference.
-- Definitions are plain text with inline links written as [[slug|visible text]] (see glossary_term.definition_*).
-- The content itself is in V6__glossary_content.sql.

-- Fuzzy search ("divdend" finds "Dividend"). Needs a database user that may create extensions.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE glossary_category (
    id       BIGINT      PRIMARY KEY,
    slug     VARCHAR(40) NOT NULL UNIQUE,
    name     VARCHAR(60) NOT NULL,
    position INT         NOT NULL
);

CREATE TABLE glossary_term (
    id                  BIGINT       PRIMARY KEY,
    slug                VARCHAR(60)  NOT NULL UNIQUE,
    name                VARCHAR(80)  NOT NULL,
    full_name           VARCHAR(120),                  -- subtitle, e.g. "Exchange-traded fund"
    category_id         BIGINT       NOT NULL REFERENCES glossary_category (id),
    position            INT          NOT NULL,         -- order inside the category
    short_description   VARCHAR(160) NOT NULL,         -- one line shown in lists
    definition_standard TEXT         NOT NULL,
    definition_plain    TEXT,                          -- NULL = the "in plain words" version does not exist yet
    example             TEXT,
    aliases             TEXT[]       NOT NULL DEFAULT '{}',  -- synonyms matched by search
    graphic_key         VARCHAR(40),                   -- which small SVG graphic the app draws, NULL = none
    lesson_id           BIGINT REFERENCES lesson (id) ON DELETE SET NULL  -- "Practise it" card
);
CREATE INDEX glossary_term_category ON glossary_term (category_id, position);
CREATE INDEX glossary_term_name_trgm ON glossary_term USING gin (lower(name) gin_trgm_ops);

-- "Related terms" chips. position is 0-based (Hibernate @OrderColumn).
CREATE TABLE glossary_related (
    term_id         BIGINT NOT NULL REFERENCES glossary_term (id) ON DELETE CASCADE,
    related_term_id BIGINT NOT NULL REFERENCES glossary_term (id) ON DELETE CASCADE,
    position        INT    NOT NULL,
    PRIMARY KEY (term_id, related_term_id)
);

-- user_id is the bank's customer id, like user_profile.user_id (no foreign key: the profile may not exist yet).
CREATE TABLE glossary_favorite (
    user_id    VARCHAR(64) NOT NULL,
    term_id    BIGINT      NOT NULL REFERENCES glossary_term (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, term_id)
);

CREATE TABLE glossary_preference (
    user_id        VARCHAR(64) PRIMARY KEY,
    language_level VARCHAR(16) NOT NULL CHECK (language_level IN ('plain', 'standard'))
);
