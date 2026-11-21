-- V17: Duel v2 and unified XP event ledger

-- 1. Shared XP ledger
CREATE TABLE xp_event (
    id          BIGSERIAL   PRIMARY KEY,
    user_id     VARCHAR(64) NOT NULL,
    category    VARCHAR(32) NOT NULL,
    source      VARCHAR(8)  NOT NULL CHECK (source IN ('LESSON', 'DUEL')),
    source_ref  VARCHAR(64) NOT NULL,
    xp          INT         NOT NULL CHECK (xp > 0),
    created_at  TIMESTAMPTZ NOT NULL,
    UNIQUE (user_id, source, source_ref, category)
);
CREATE INDEX xp_event_user_cat_idx ON xp_event (user_id, category);
CREATE INDEX xp_event_created_idx  ON xp_event (created_at);

-- 2. Back-fill xp_event from lesson_completion (skip legacy-*)
INSERT INTO xp_event (user_id, category, source, source_ref, xp, created_at)
SELECT user_id,
       regexp_replace(lesson_id, '-[0-9]+$', ''),
       'LESSON',
       lesson_id,
       xp,
       completed_at
FROM lesson_completion
WHERE lesson_id NOT LIKE 'legacy-%' AND xp > 0
ON CONFLICT (user_id, source, source_ref, category) DO NOTHING;

-- 3. Drop v1 duel tables
DROP TABLE IF EXISTS duel_answer CASCADE;
DROP TABLE IF EXISTS duel_match_question CASCADE;
DROP TABLE IF EXISTS duel_match CASCADE;
DROP TABLE IF EXISTS duel_question CASCADE;
DROP TABLE IF EXISTS duel_progress CASCADE;
DROP TABLE IF EXISTS duel_category CASCADE;

-- 4. Recreate v2 match tables
CREATE TABLE duel_match (
    id             BIGSERIAL    PRIMARY KEY,
    mode           VARCHAR(8)   NOT NULL CHECK (mode IN ('HUMAN', 'SOLO')),
    categories     TEXT[]       NOT NULL,
    user_id        VARCHAR(64)  NOT NULL,
    rival_user_id  VARCHAR(64),
    status         VARCHAR(16)  NOT NULL CHECK (status IN ('IN_PROGRESS', 'FINISHED', 'ABANDONED')),
    score          INT,
    rival_score    INT,
    xp_gained      INT          NOT NULL DEFAULT 0,
    outcome        VARCHAR(8)   CHECK (outcome IN ('WIN', 'DRAW', 'LOSS', 'SOLO')),
    seen_by_player BOOLEAN      NOT NULL DEFAULT FALSE,
    started_at     TIMESTAMPTZ  NOT NULL,
    ended_at       TIMESTAMPTZ
);
CREATE INDEX duel_match_user_idx ON duel_match (user_id, started_at);

CREATE TABLE duel_answer (
    id              BIGSERIAL    PRIMARY KEY,
    match_id        BIGINT       NOT NULL REFERENCES duel_match (id) ON DELETE CASCADE,
    position        INT          NOT NULL,
    question_id     VARCHAR(64)  NOT NULL,
    category        VARCHAR(32)  NOT NULL,
    chosen_answer   TEXT,
    correct         BOOLEAN      NOT NULL,
    outcome         VARCHAR(8)   NOT NULL CHECK (outcome IN ('ANSWERED', 'TIMEOUT')),
    ms_taken        INT,
    rival_correct   BOOLEAN,
    rival_answer_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_duel_answer_match_pos UNIQUE (match_id, position)
);
CREATE INDEX duel_answer_match_idx ON duel_answer (match_id, position);
