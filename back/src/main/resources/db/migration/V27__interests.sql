-- Goal ids are not story ids, so every profile starts with no interests.
ALTER TABLE user_profile RENAME COLUMN goals TO interests;
UPDATE user_profile SET interests = '{}';
