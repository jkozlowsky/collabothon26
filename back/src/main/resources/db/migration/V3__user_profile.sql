-- Per-user profile. user_id is the bank's customer id: Finance Quest runs inside the
-- banking app, which already knows who is signed in.
-- Onboarding answers are all optional (the user may skip the questions).
CREATE TABLE user_profile (
    user_id                 VARCHAR(64) PRIMARY KEY,
    life_stage              VARCHAR(32),
    goals                   TEXT[]      NOT NULL DEFAULT '{}',
    experience              VARCHAR(32),
    learning_style          VARCHAR(32),
    confidence              SMALLINT CHECK (confidence BETWEEN 1 AND 5),
    onboarding_skipped      BOOLEAN     NOT NULL,
    onboarding_completed_at TIMESTAMPTZ NOT NULL
);
