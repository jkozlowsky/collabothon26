-- The Saving (Berlin) and Investing (Tokyo) paths were reordered: each lesson now belongs to the path of its area.
-- Inflation stays mission 1 (berlin-1); the emergency fund moved to berlin-2. Compound interest and falls
-- (area 'investing') now start the Tokyo path's lessons on those topics.
UPDATE check_question
SET lesson_id = CASE lesson_id
    WHEN 'berlin-3' THEN 'berlin-2'
    WHEN 'berlin-2' THEN 'tokyo-5'
    WHEN 'berlin-4' THEN 'tokyo-2'
END
WHERE lesson_id IN ('berlin-2', 'berlin-3', 'berlin-4');
