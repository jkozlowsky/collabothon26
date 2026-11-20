-- Per-user profile. user_id is the bank's customer id: Finance Quest runs inside the
-- banking app, which already knows who is signed in.
-- Onboarding answers are all optional (the user may skip the questions). onboarding_completed
-- makes onboarding show only once per user; the profile can later hold other data (XP, progress).
CREATE TABLE user_profile (
    user_id                 VARCHAR(64) PRIMARY KEY,
    life_stage              VARCHAR(32),
    goals                   TEXT[]      NOT NULL DEFAULT '{}',
    experience              VARCHAR(32),
    onboarding_completed    BOOLEAN     NOT NULL DEFAULT FALSE,
    onboarding_skipped      BOOLEAN     NOT NULL DEFAULT FALSE,
    onboarding_completed_at TIMESTAMPTZ
);
