-- Duel names and avatars now come from the bank account (first_name, avatar m1..f3), not from duel_player.
-- Every duel demo player without an account gets one; demo-user already exists (Alex Krause, m1).
-- duel_progress / duel_match reference users only by user_id, so dropping duel_player breaks nothing.
INSERT INTO account (user_id, first_name, last_name, avatar) VALUES
    ('demo-tomasz', 'Tomasz', 'Nowak',     'm2'),
    ('demo-ola',    'Ola',    'Wisniewska', 'f1'),
    ('demo-marta',  'Marta',  'Kaminska',  'f2'),
    ('demo-jonas',  'Jonas',  'Becker',    'm3'),
    ('demo-marek',  'Marek',  'Zielinski', 'm1'),
    ('demo-sofia',  'Sofia',  'Rossi',     'f3'),
    ('demo-kasia',  'Kasia',  'Lewandowska', 'f1'),
    ('demo-lukas',  'Lukas',  'Schneider', 'm2'),
    ('demo-nina',   'Nina',   'Vogel',     'f2'),
    ('demo-piotr',  'Piotr',  'Mazur',     'm3'),
    ('demo-ewa',    'Ewa',    'Dabrowska', 'f3')
ON CONFLICT (user_id) DO NOTHING;

DROP TABLE duel_player;
