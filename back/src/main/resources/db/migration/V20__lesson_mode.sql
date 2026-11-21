-- Lesson video mode (.plans/lesson-video-mode-spec.md §5.3, §6.2).
-- The mode lessons with a video track open in; switched inside a lesson, remembered per user. New users: video.
ALTER TABLE user_profile
    ADD COLUMN preferred_lesson_mode VARCHAR(8) NOT NULL DEFAULT 'video'
        CHECK (preferred_lesson_mode IN ('classic', 'video'));

-- The mode a lesson was first finished in, for the pitch metric "how many finish in video".
-- Null for completions saved before this migration.
ALTER TABLE lesson_completion
    ADD COLUMN mode VARCHAR(8) CHECK (mode IN ('classic', 'video'));
