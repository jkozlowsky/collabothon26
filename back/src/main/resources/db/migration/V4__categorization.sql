-- One categorisation per user, the whole result as JSON.
CREATE TABLE categorization (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES user_profile (user_id) ON DELETE CASCADE,
    data    JSONB NOT NULL
);

-- The demo reset (DELETE /api/users/{id}/profile/onboarding) keeps the profile row and only clears
-- onboarding_completed, so the cascade above never fires for it; the categorisation goes with the answers.
CREATE FUNCTION forget_categorization() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM categorization WHERE user_id = NEW.user_id;
    RETURN NULL;
END
$$;

CREATE TRIGGER onboarding_reset_forgets_categorization
    AFTER UPDATE OF onboarding_completed ON user_profile
    FOR EACH ROW WHEN (OLD.onboarding_completed AND NOT NEW.onboarding_completed)
    EXECUTE FUNCTION forget_categorization();
