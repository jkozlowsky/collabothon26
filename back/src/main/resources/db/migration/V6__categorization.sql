-- One categorisation per user, the whole result as JSON. Deleting the profile (demo reset) deletes it too.
CREATE TABLE categorization (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES user_profile (user_id) ON DELETE CASCADE,
    data    JSONB NOT NULL
);
