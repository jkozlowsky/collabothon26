-- The bank customer behind a profile. In the real integration the bank owns this record;
-- here it is seeded. The bank picks the default avatar (m* / f*) from the salutation.
CREATE TABLE account (
    user_id    VARCHAR(64)  PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name  VARCHAR(100) NOT NULL,
    avatar     VARCHAR(8)   NOT NULL CHECK (avatar IN ('m1', 'm2', 'm3', 'f1', 'f2', 'f3'))
);

INSERT INTO account (user_id, first_name, last_name, avatar) VALUES ('demo-user', 'Alex', 'Krause', 'm1');

-- One row per finished lesson. Streak, XP and lessons completed are all derived from this table.
-- completed_on is the user's local date (sent by the app), so a lesson at 23:30 counts for that day.
-- xp is what this completion earned: the lesson's XP the first time, 0 for a repeat.
CREATE TABLE lesson_completion (
    id           BIGSERIAL   PRIMARY KEY,
    user_id      VARCHAR(64) NOT NULL,
    lesson_id    BIGINT      NOT NULL REFERENCES lesson (id),
    completed_on DATE        NOT NULL,
    xp           INT         NOT NULL CHECK (xp >= 0)
);

CREATE INDEX lesson_completion_user_idx ON lesson_completion (user_id);
