-- Demo accounts and account lock session table.
-- Fixed demo accounts: Alex (demo-user, in V4), Daniel (demo-daniel), Elena (demo-elena),
-- and 36 international mock players -> 50 demo accounts total.

INSERT INTO account (user_id, first_name, last_name, avatar) VALUES
    ('demo-daniel',  'Daniel',  'Okafor',      'm2'),
    ('demo-elena',   'Elena',   'Petrova',     'f3'),
    ('demo-liam',    'Liam',    'Murphy',      'm1'),
    ('demo-chloe',   'Chloe',   'Dubois',      'f1'),
    ('demo-matteo',  'Matteo',  'Ricci',       'm2'),
    ('demo-yuki',    'Yuki',    'Tanaka',      'f2'),
    ('demo-carlos',  'Carlos',  'Silva',       'm3'),
    ('demo-amelie',  'Amelie',  'Laurent',     'f3'),
    ('demo-lars',    'Lars',    'Lindholm',    'm1'),
    ('demo-fatima',  'Fatima',  'Al-Mansoor',  'f1'),
    ('demo-kwame',   'Kwame',   'Mensah',      'm2'),
    ('demo-sora',    'Sora',    'Kim',         'f2'),
    ('demo-hugo',    'Hugo',    'Santos',      'm3'),
    ('demo-astrid',  'Astrid',  'Nielsen',     'f3'),
    ('demo-tariq',   'Tariq',   'Haddad',      'm1'),
    ('demo-freja',   'Freja',   'Johansson',   'f1'),
    ('demo-diego',   'Diego',   'Hernandez',   'm2'),
    ('demo-ananya',  'Ananya',  'Sharma',      'f2'),
    ('demo-lucas',   'Lucas',   'Moreau',      'm3'),
    ('demo-camila',  'Camila',  'Torres',      'f3'),
    ('demo-finn',    'Finn',    'O''Connor',   'm1'),
    ('demo-ines',    'Ines',    'Ferreira',    'f1'),
    ('demo-noah',    'Noah',    'Van Dijk',    'm2'),
    ('demo-zeynep',  'Zeynep',  'Demir',       'f2'),
    ('demo-mateo',   'Mateo',   'Gomez',       'm3'),
    ('demo-chiara',  'Chiara',  'Esposito',    'f3'),
    ('demo-artur',   'Artur',   'Kovacs',      'm1'),
    ('demo-leila',   'Leila',   'Benali',      'f1'),
    ('demo-soren',   'Soren',   'Muller',      'm2'),
    ('demo-elise',   'Elise',   'Fontaine',    'f2'),
    ('demo-kenji',   'Kenji',   'Sato',        'm3'),
    ('demo-mariam',  'Mariam',  'Diallo',      'f3'),
    ('demo-felix',   'Felix',   'Weber',       'm1'),
    ('demo-nadia',   'Nadia',   'Popescu',     'f1'),
    ('demo-gabriel', 'Gabriel', 'Costa',       'm2'),
    ('demo-alina',   'Alina',   'Ionescu',     'f2'),
    ('demo-omar',    'Omar',    'Farooq',      'm3'),
    ('demo-maya',    'Maya',    'Patel',       'f3')
ON CONFLICT (user_id) DO NOTHING;

CREATE TABLE account_session (
    user_id      VARCHAR(64)  PRIMARY KEY REFERENCES account(user_id),
    device_id    VARCHAR(64)  NOT NULL,
    heartbeat_at TIMESTAMPTZ  NOT NULL
);
