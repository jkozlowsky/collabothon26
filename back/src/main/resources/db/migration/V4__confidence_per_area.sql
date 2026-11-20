-- Onboarding now asks for confidence (1-5) in three areas instead of one overall score.
ALTER TABLE user_profile RENAME COLUMN confidence TO confidence_budgeting;
ALTER TABLE user_profile
    ADD COLUMN confidence_saving    SMALLINT CHECK (confidence_saving BETWEEN 1 AND 5),
    ADD COLUMN confidence_investing SMALLINT CHECK (confidence_investing BETWEEN 1 AND 5);
