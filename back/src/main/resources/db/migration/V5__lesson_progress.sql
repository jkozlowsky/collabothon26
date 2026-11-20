-- Lesson content moved to JSON files (resources/content), so the V2 tables go.
-- What stays in the database is per-user progress.
DROP TABLE question;
DROP TABLE lesson;

-- First completion of a lesson; XP is awarded once per lesson.
CREATE TABLE lesson_completion (
    user_id      VARCHAR(64) NOT NULL,
    lesson_id    VARCHAR(64) NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    xp           INT         NOT NULL,
    PRIMARY KEY (user_id, lesson_id)
);

-- Knowledge per glossary concept: graded steps answered right on the first try / all graded steps seen.
CREATE TABLE concept_knowledge (
    user_id  VARCHAR(64) NOT NULL,
    concept  VARCHAR(64) NOT NULL,
    correct  INT         NOT NULL,
    attempts INT         NOT NULL,
    PRIMARY KEY (user_id, concept)
);

-- Decisions taken in scenario steps (input for later recommendations).
CREATE TABLE scenario_choice (
    id         BIGSERIAL PRIMARY KEY,
    user_id    VARCHAR(64) NOT NULL,
    lesson_id  VARCHAR(64) NOT NULL,
    step_id    VARCHAR(64) NOT NULL,
    choice     INT         NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
