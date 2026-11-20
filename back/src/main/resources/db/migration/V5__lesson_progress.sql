-- Move from numeric quiz IDs to JSON lesson IDs while preserving profile history.
ALTER TABLE lesson_completion RENAME TO legacy_lesson_completion;

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

CREATE TABLE lesson_activity (
    user_id      VARCHAR(64) NOT NULL,
    completed_on DATE NOT NULL,
    PRIMARY KEY (user_id, completed_on)
);

INSERT INTO lesson_activity (user_id, completed_on)
SELECT DISTINCT user_id, completed_on FROM legacy_lesson_completion;

INSERT INTO lesson_completion (user_id, lesson_id, completed_at, xp)
SELECT user_id, 'legacy-' || lesson_id, MIN(completed_on)::timestamp AT TIME ZONE 'UTC', SUM(xp)
FROM legacy_lesson_completion
GROUP BY user_id, lesson_id;

DROP TABLE legacy_lesson_completion;
DROP TABLE question;
DROP TABLE lesson;
