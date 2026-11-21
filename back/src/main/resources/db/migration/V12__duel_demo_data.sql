-- F8 duel mode: demo players, category progress and current-week matches.
-- Aligns with the Figma demo story (.plans/duel-design/*.png):
--   * Alex ('demo-user', avatar 2): Instruments Lv 42 (1156), Risk Lv 18 (1012),
--     Costs Lv 7 (3/5 calibrating), Inflation & compounding Lv 3 (1/5 calibrating),
--     Investor psychology Lv 12 (1084, 6 matches; 439 XP so a +52 XP win reaches Lv 13 38/58).
--   * Marek ('demo-marek', avatar 4): Investor psychology Elo 1120 (so Alex beating Marek
--     at K=32 earns +18 Elo -> 1102).
--   * Weekly league totals: Tomasz +142, Ola +128, Marta +97, Jonas +88, Marek +74,
--     Sofia +61, Kasia +54, Alex +46 (winning one ranked match climbs Alex past Kasia & Sofia).
-- Total XP values are computed from cost(n) = round(20 + 2 * n^1.15) summed for n = 1..L-1.

INSERT INTO duel_player (user_id, display_name, avatar) VALUES
    ('demo-user',   'Alex',   2),
    ('demo-tomasz', 'Tomasz', 3),
    ('demo-ola',    'Ola',    1),
    ('demo-marta',  'Marta',  4),
    ('demo-jonas',  'Jonas',  2),
    ('demo-marek',  'Marek',  4),
    ('demo-sofia',  'Sofia',  1),
    ('demo-kasia',  'Kasia',  3),
    ('demo-lukas',  'Lukas',  2),
    ('demo-nina',   'Nina',   1),
    ('demo-piotr',  'Piotr',  3),
    ('demo-ewa',    'Ewa',    4);

INSERT INTO duel_progress (user_id, category_id, xp, elo, human_matches) VALUES
    -- Alex (demo-user):
    --   cat 1 Lv 42 (base 3623, next 167 -> 3731 = 108/167)
    --   cat 2 Lv 18 (base  779, next  76 ->  802 =  23/76)
    --   cat 3 Lv  7 (base  172, next  39 ->  201 =  29/39), calibrating 3/5
    --   cat 4 Lv  3 (base   46, next  27 ->   52 =   6/27), calibrating 1/5
    --   cat 5 Lv 12 (base  398, next  55 ->  439 =  41/55; +52 XP -> Lv 13 38/58)
    ('demo-user', 1, 3731, 1156, 22),
    ('demo-user', 2,  802, 1012, 11),
    ('demo-user', 3,  201, 1018,  3),
    ('demo-user', 4,   52, 1006,  1),
    ('demo-user', 5,  439, 1084,  6),

    -- Tomasz: Lv 32-38, avg Elo 1328
    ('demo-tomasz', 1, 3070, 1348, 9),
    ('demo-tomasz', 2, 2635, 1326, 8),
    ('demo-tomasz', 3, 2235, 1312, 8),
    ('demo-tomasz', 4, 2776, 1338, 9),
    ('demo-tomasz', 5, 2498, 1316, 8),

    -- Ola: Lv 26-30, avg Elo 1294
    ('demo-ola', 1, 1987, 1318, 9),
    ('demo-ola', 2, 1755, 1294, 8),
    ('demo-ola', 3, 1644, 1280, 8),
    ('demo-ola', 4, 1869, 1306, 9),
    ('demo-ola', 5, 1537, 1272, 8),

    -- Marta: Lv 21-25, avg Elo 1248
    ('demo-marta', 1, 1335, 1264, 8),
    ('demo-marta', 2, 1240, 1248, 8),
    ('demo-marta', 3, 1060, 1222, 7),
    ('demo-marta', 4, 1148, 1236, 8),
    ('demo-marta', 5, 1434, 1270, 9),

    -- Jonas: Lv 30-32 (Lv 31 avg), avg Elo 1342
    ('demo-jonas', 1, 2235, 1342, 9),
    ('demo-jonas', 2, 2109, 1342, 9),
    ('demo-jonas', 3, 1987, 1334, 8),
    ('demo-jonas', 4, 2109, 1346, 9),
    ('demo-jonas', 5, 2109, 1346, 8),

    -- Marek: Lv 18-20 (Lv 19 in psychology, Elo 1120)
    ('demo-marek', 1,  975, 1138, 8),
    ('demo-marek', 2,  894, 1114, 7),
    ('demo-marek', 3,  817, 1096, 7),
    ('demo-marek', 4,  894, 1108, 8),
    ('demo-marek', 5,  894, 1120, 8),

    -- Sofia: Lv 23-25 (Lv 24 avg), avg Elo 1205
    ('demo-sofia', 1, 1434, 1218, 9),
    ('demo-sofia', 2, 1335, 1202, 8),
    ('demo-sofia', 3, 1240, 1192, 7),
    ('demo-sofia', 4, 1335, 1208, 8),
    ('demo-sofia', 5, 1335, 1205, 8),

    -- Kasia: Lv 15-17, avg Elo 1158
    ('demo-kasia', 1,  743, 1172, 8),
    ('demo-kasia', 2,  672, 1154, 7),
    ('demo-kasia', 3,  605, 1140, 6),
    ('demo-kasia', 4,  672, 1158, 7),
    ('demo-kasia', 5,  672, 1166, 7),

    -- Lukas: Lv 13-15, avg Elo 1058 (experienced, K=16)
    ('demo-lukas', 1,  605, 1074, 16),
    ('demo-lukas', 2,  542, 1058, 14),
    ('demo-lukas', 3,  482, 1042, 12),
    ('demo-lukas', 4,  542, 1064, 15),
    ('demo-lukas', 5,  542, 1052, 13),

    -- Nina: Lv 10-12, avg Elo 1032 (experienced, K=16)
    ('demo-nina', 1,  425, 1046, 14),
    ('demo-nina', 2,  372, 1032, 13),
    ('demo-nina', 3,  322, 1018, 12),
    ('demo-nina', 4,  372, 1038, 14),
    ('demo-nina', 5,  372, 1026, 13),

    -- Piotr: Lv 9-10, avg Elo 1018 (experienced, K=16)
    ('demo-piotr', 1,  322, 1028, 15),
    ('demo-piotr', 2,  275, 1016, 13),
    ('demo-piotr', 3,  275, 1008, 12),
    ('demo-piotr', 4,  322, 1022, 14),
    ('demo-piotr', 5,  322, 1014, 13),

    -- Ewa: Lv 8-9, avg Elo 1007 (experienced, K=16)
    ('demo-ewa', 1,  275, 1014, 14),
    ('demo-ewa', 2,  232, 1006, 12),
    ('demo-ewa', 3,  232, 1002, 12),
    ('demo-ewa', 4,  275, 1010, 13),
    ('demo-ewa', 5,  275, 1004, 12);

-- Finished HUMAN matches placed proportionally between the start of the current ISO week
-- (Monday 00:00, safe in both Europe/Berlin and UTC) and now(), so every row always lands
-- inside the current week even right after Monday midnight.
WITH week_bounds AS (
    SELECT
        GREATEST(
            date_trunc('week', now() AT TIME ZONE 'Europe/Berlin') AT TIME ZONE 'Europe/Berlin',
            date_trunc('week', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
        ) AS ws,
        now() AS cur
),
seeded(id, category_id, player_a, player_b, score_a, score_b, xp_a, xp_b, elo_delta_a, elo_delta_b, frac) AS (
    VALUES
        -- Tomasz (+142)
        ( 1, 1, 'demo-tomasz', 'demo-lukas', 5, 3, 60, 24, 24, -12, 0.12),
        ( 2, 2, 'demo-tomasz', 'demo-nina',  6, 2, 68, 16, 24, -12, 0.24),
        ( 3, 3, 'demo-tomasz', 'demo-piotr', 5, 2, 60, 16, 24, -12, 0.38),
        ( 4, 4, 'demo-tomasz', 'demo-ewa',   5, 3, 60, 24, 24, -12, 0.54),
        ( 5, 5, 'demo-tomasz', 'demo-lukas', 4, 2, 52, 16, 23, -11, 0.72),
        ( 6, 1, 'demo-tomasz', 'demo-nina',  5, 4, 60, 32, 23, -11, 0.88),

        -- Ola (+128)
        ( 7, 1, 'demo-ola',    'demo-piotr', 5, 3, 60, 24, 22, -11, 0.15),
        ( 8, 2, 'demo-ola',    'demo-ewa',   5, 2, 60, 16, 22, -11, 0.28),
        ( 9, 3, 'demo-ola',    'demo-lukas', 4, 3, 52, 24, 21, -10, 0.42),
        (10, 4, 'demo-ola',    'demo-nina',  5, 3, 60, 24, 21, -10, 0.58),
        (11, 5, 'demo-ola',    'demo-piotr', 6, 3, 68, 24, 21, -10, 0.75),
        (12, 1, 'demo-ola',    'demo-ewa',   4, 2, 52, 16, 21, -10, 0.90),

        -- Marta (+97)
        (13, 2, 'demo-marta',  'demo-lukas', 5, 3, 60, 24, 20, -10, 0.18),
        (14, 3, 'demo-marta',  'demo-nina',  4, 2, 52, 16, 20, -10, 0.34),
        (15, 4, 'demo-marta',  'demo-piotr', 5, 4, 60, 32, 19,  -9, 0.50),
        (16, 5, 'demo-marta',  'demo-ewa',   5, 3, 60, 24, 19,  -9, 0.68),
        (17, 1, 'demo-marta',  'demo-lukas', 4, 3, 52, 24, 19,  -9, 0.84),

        -- Jonas (+88)
        (18, 1, 'demo-jonas',  'demo-nina',  5, 2, 60, 16, 18,  -9, 0.20),
        (19, 2, 'demo-jonas',  'demo-piotr', 5, 3, 60, 24, 18,  -9, 0.36),
        (20, 3, 'demo-jonas',  'demo-ewa',   4, 2, 52, 16, 18,  -9, 0.52),
        (21, 4, 'demo-jonas',  'demo-lukas', 5, 4, 60, 32, 17,  -8, 0.70),
        (22, 5, 'demo-jonas',  'demo-nina',  4, 3, 52, 24, 17,  -8, 0.86),

        -- Marek (+74)
        (23, 5, 'demo-marek',  'demo-piotr', 5, 3, 60, 24, 19,  -9, 0.22),
        (24, 1, 'demo-marek',  'demo-ewa',   4, 2, 52, 16, 19,  -9, 0.44),
        (25, 5, 'demo-marek',  'demo-lukas', 5, 4, 60, 32, 18,  -9, 0.66),
        (26, 2, 'demo-marek',  'demo-nina',  4, 3, 52, 24, 18,  -9, 0.82),

        -- Sofia (+61)
        (27, 3, 'demo-sofia',  'demo-piotr', 4, 2, 52, 16, 16,  -8, 0.26),
        (28, 4, 'demo-sofia',  'demo-ewa',   5, 3, 60, 24, 15,  -8, 0.46),
        (29, 2, 'demo-sofia',  'demo-lukas', 4, 3, 52, 24, 15,  -8, 0.64),
        (30, 5, 'demo-sofia',  'demo-nina',  5, 4, 60, 32, 15,  -8, 0.80),

        -- Kasia (+54)
        (31, 1, 'demo-kasia',  'demo-piotr', 5, 3, 60, 24, 18,  -9, 0.30),
        (32, 2, 'demo-kasia',  'demo-ewa',   4, 2, 52, 16, 18,  -9, 0.56),
        (33, 4, 'demo-kasia',  'demo-lukas', 5, 4, 60, 32, 18,  -9, 0.78),

        -- Alex / demo-user (+46)
        (34, 5, 'demo-user',   'demo-nina',  5, 3, 60, 24, 16,  -8, 0.32),
        (35, 1, 'demo-user',   'demo-piotr', 4, 3, 52, 24, 15,  -8, 0.62),
        (36, 5, 'demo-user',   'demo-ewa',   5, 4, 60, 32, 15,  -8, 0.92)
)
INSERT INTO duel_match (
    id,
    mode,
    category_id,
    player_a,
    player_b,
    bot_name,
    bot_level,
    status,
    score_a,
    score_b,
    xp_a,
    xp_b,
    elo_delta_a,
    elo_delta_b,
    started_at,
    ended_at
)
SELECT
    s.id,
    'HUMAN',
    s.category_id,
    s.player_a,
    s.player_b,
    NULL,
    NULL,
    'FINISHED',
    s.score_a,
    s.score_b,
    s.xp_a,
    s.xp_b,
    s.elo_delta_a,
    s.elo_delta_b,
    (wb.ws + (wb.cur - wb.ws) * s.frac) - interval '3 minutes',
    wb.ws + (wb.cur - wb.ws) * s.frac
FROM seeded s
CROSS JOIN week_bounds wb;

SELECT setval('duel_match_id_seq', (SELECT COALESCE(MAX(id), 1) FROM duel_match));
