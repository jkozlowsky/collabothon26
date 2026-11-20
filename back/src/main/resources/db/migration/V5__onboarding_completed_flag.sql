-- Explicit "onboarding done" flag on the profile, so onboarding shows only once per user and the
-- profile can hold other data (XP, progress) before or after onboarding.
ALTER TABLE user_profile ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
-- Rows so far were only ever created by finishing or skipping onboarding.
UPDATE user_profile SET onboarding_completed = TRUE;
ALTER TABLE user_profile ALTER COLUMN onboarding_completed_at DROP NOT NULL;
ALTER TABLE user_profile ALTER COLUMN onboarding_skipped SET DEFAULT FALSE;
