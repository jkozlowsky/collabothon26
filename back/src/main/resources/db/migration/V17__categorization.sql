-- One categorisation per user, the whole result as JSON.
CREATE TABLE categorization (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES user_profile (user_id) ON DELETE CASCADE,
    data    JSONB NOT NULL
);

-- Every new onboarding (each PUT /api/users/{id}/profile/onboarding) and every demo reset
-- (DELETE .../profile/onboarding, which keeps the row) changes onboarding_completed_at, so the
-- categorisation built from the previous answers goes with them. The cascade above only covers a
-- deleted profile row.
CREATE FUNCTION forget_categorization() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    DELETE FROM categorization WHERE user_id = NEW.user_id;
    RETURN NULL;
END
$$;

CREATE TRIGGER new_onboarding_forgets_categorization
    AFTER UPDATE OF onboarding_completed_at ON user_profile
    FOR EACH ROW WHEN (OLD.onboarding_completed_at IS DISTINCT FROM NEW.onboarding_completed_at)
    EXECUTE FUNCTION forget_categorization();
