-- V26: Duel v4 area categories mapping
-- Map story ids to area slugs in xp_event.category, duel_match.categories and duel_answer.category.

-- 1. Temporary table to aggregate xp_event with mapped category and summed XP
CREATE TEMPORARY TABLE xp_event_mapped AS
SELECT
    MIN(id) AS id,
    user_id,
    CASE category
        WHEN 'buenos-aires' THEN 'money-basics'
        WHEN 'berlin' THEN 'saving'
        WHEN 'nairobi' THEN 'saving'
        WHEN 'sao-paulo' THEN 'borrowing'
        WHEN 'tokyo' THEN 'investing'
        WHEN 'mumbai' THEN 'investing'
        WHEN 'seoul' THEN 'risk'
        ELSE category
    END AS category,
    source,
    source_ref,
    SUM(xp) AS xp,
    MIN(created_at) AS created_at
FROM xp_event
GROUP BY user_id, source, source_ref,
    CASE category
        WHEN 'buenos-aires' THEN 'money-basics'
        WHEN 'berlin' THEN 'saving'
        WHEN 'nairobi' THEN 'saving'
        WHEN 'sao-paulo' THEN 'borrowing'
        WHEN 'tokyo' THEN 'investing'
        WHEN 'mumbai' THEN 'investing'
        WHEN 'seoul' THEN 'risk'
        ELSE category
    END;

TRUNCATE TABLE xp_event;

INSERT INTO xp_event (id, user_id, category, source, source_ref, xp, created_at)
SELECT id, user_id, category, source, source_ref, xp, created_at
FROM xp_event_mapped;

DROP TABLE xp_event_mapped;

SELECT setval('xp_event_id_seq', COALESCE((SELECT MAX(id) FROM xp_event), 1));

-- 2. Map duel_match categories (TEXT[]) and deduplicate
UPDATE duel_match
SET categories = ARRAY(
    SELECT DISTINCT
        CASE c
            WHEN 'buenos-aires' THEN 'money-basics'
            WHEN 'berlin' THEN 'saving'
            WHEN 'nairobi' THEN 'saving'
            WHEN 'sao-paulo' THEN 'borrowing'
            WHEN 'tokyo' THEN 'investing'
            WHEN 'mumbai' THEN 'investing'
            WHEN 'seoul' THEN 'risk'
            ELSE c
        END
    FROM unnest(categories) AS c
);

-- 3. Map duel_answer category
UPDATE duel_answer
SET category = CASE category
    WHEN 'buenos-aires' THEN 'money-basics'
    WHEN 'berlin' THEN 'saving'
    WHEN 'nairobi' THEN 'saving'
    WHEN 'sao-paulo' THEN 'borrowing'
    WHEN 'tokyo' THEN 'investing'
    WHEN 'mumbai' THEN 'investing'
    WHEN 'seoul' THEN 'risk'
    ELSE category
END;
