-- F8 duel mode: live 1v1 knowledge duels (spec: .plans/duel-mode-spec.md).
-- user_id is the same string id as user_profile.user_id (the bank's customer id).

CREATE TABLE duel_category (
    id       BIGSERIAL PRIMARY KEY,
    slug     VARCHAR(32)  NOT NULL UNIQUE,
    name_en  VARCHAR(100) NOT NULL,
    name_pl  VARCHAR(100) NOT NULL,
    icon     VARCHAR(16)  NOT NULL,   -- icon key the frontend maps to an icon (trend, pie, percent, coins, brain)
    position INT          NOT NULL
);

INSERT INTO duel_category (id, slug, name_en, name_pl, icon, position) VALUES
    (1, 'instruments',  'Instruments',             'Instrumenty',                 'trend',   1),
    (2, 'risk',         'Risk & diversification',  'Ryzyko i dywersyfikacja',     'pie',     2),
    (3, 'costs',        'Costs & taxes',           'Koszty i podatki',            'percent', 3),
    (4, 'money-basics', 'Inflation & compounding', 'Inflacja i procent składany', 'coins',   4),
    (5, 'psychology',   'Investor psychology',     'Psychologia inwestora',       'brain',   5);
SELECT setval('duel_category_id_seq', 5);

-- Separate from the lesson `question` table, which requires a lesson_id.
CREATE TABLE duel_question (
    id             BIGSERIAL PRIMARY KEY,
    category_id    BIGINT     NOT NULL REFERENCES duel_category (id),
    difficulty     VARCHAR(8) NOT NULL CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    prompt_en      TEXT       NOT NULL,
    prompt_pl      TEXT       NOT NULL,
    options_en     TEXT[]     NOT NULL CHECK (cardinality(options_en) = 4),
    options_pl     TEXT[]     NOT NULL CHECK (cardinality(options_pl) = 4),  -- same order as options_en
    correct_index  INT        NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
    explanation_en TEXT       NOT NULL,
    explanation_pl TEXT       NOT NULL
);
CREATE INDEX duel_question_category_idx ON duel_question (category_id, difficulty);

-- Display name and avatar for duel opponents and rankings. Stand-in until the account
-- module exposes names; avatar = Explorer Avatar rank 1..4 from the Figma kit.
CREATE TABLE duel_player (
    user_id      VARCHAR(64) PRIMARY KEY,
    display_name VARCHAR(64) NOT NULL,
    avatar       SMALLINT    NOT NULL DEFAULT 1 CHECK (avatar BETWEEN 1 AND 4)
);

CREATE TABLE duel_match (
    id          BIGSERIAL PRIMARY KEY,
    mode        VARCHAR(8)  NOT NULL CHECK (mode IN ('HUMAN', 'BOT', 'SOLO')),
    category_id BIGINT      NOT NULL REFERENCES duel_category (id),
    player_a    VARCHAR(64) NOT NULL,
    player_b    VARCHAR(64),             -- null for BOT and SOLO
    bot_name    VARCHAR(64),
    bot_level   INT,
    status      VARCHAR(16) NOT NULL CHECK (status IN ('IN_PROGRESS', 'FINISHED', 'ABANDONED')),
    score_a     INT,
    score_b     INT,
    xp_a        INT,
    xp_b        INT,
    elo_delta_a INT,                     -- null unless HUMAN; summed for the weekly league
    elo_delta_b INT,
    started_at  TIMESTAMPTZ NOT NULL,
    ended_at    TIMESTAMPTZ
);
CREATE INDEX duel_match_ended_idx ON duel_match (ended_at);

CREATE TABLE duel_match_question (
    match_id     BIGINT NOT NULL REFERENCES duel_match (id) ON DELETE CASCADE,
    position     INT    NOT NULL,         -- 0..5
    question_id  BIGINT NOT NULL REFERENCES duel_question (id),
    option_order INT[]  NOT NULL,         -- shuffled order shown to both players: option_order[k] = original index
    PRIMARY KEY (match_id, position)
);

-- One row per question per player, timeouts included. Also the answer log for F6/F7.
CREATE TABLE duel_answer (
    id           BIGSERIAL PRIMARY KEY,
    match_id     BIGINT      NOT NULL REFERENCES duel_match (id) ON DELETE CASCADE,
    user_id      VARCHAR(64) NOT NULL,    -- a bot's answers use 'bot:<name>'
    question_id  BIGINT      NOT NULL REFERENCES duel_question (id),
    position     INT         NOT NULL,
    chosen_index INT,                     -- index in the ORIGINAL options; null on timeout
    correct      BOOLEAN     NOT NULL,
    outcome      VARCHAR(8)  NOT NULL CHECK (outcome IN ('ANSWERED', 'TIMEOUT')),
    ms_taken     INT,
    created_at   TIMESTAMPTZ NOT NULL
);
CREATE INDEX duel_answer_user_idx ON duel_answer (user_id, created_at);

CREATE TABLE duel_progress (
    user_id       VARCHAR(64) NOT NULL,
    category_id   BIGINT      NOT NULL REFERENCES duel_category (id),
    xp            INT         NOT NULL DEFAULT 0,
    elo           INT         NOT NULL DEFAULT 1000,
    human_matches INT         NOT NULL DEFAULT 0,   -- K factor (32 for the first 10, then 16) and calibration (>= 5)
    PRIMARY KEY (user_id, category_id)
);
