-- Mock bank: four fictional customers whose last 90 days tell the stories in docs/specs/F1-profiling.md.
-- Transactions store days_ago, not a date, so the story stays in the window however old the database is.
CREATE TABLE bank_customer (
    id       VARCHAR(32)  PRIMARY KEY,
    name     VARCHAR(100) NOT NULL,
    age      INT          NOT NULL CHECK (age >= 18),
    headline VARCHAR(100) NOT NULL
);

CREATE TABLE bank_account (
    id              VARCHAR(32)   PRIMARY KEY,
    customer_id     VARCHAR(32)   NOT NULL REFERENCES bank_customer (id),
    type            VARCHAR(16)   NOT NULL CHECK (type IN ('current', 'savings', 'depot')),
    opening_balance NUMERIC(12, 2) NOT NULL
);
CREATE INDEX bank_account_customer_idx ON bank_account (customer_id);

CREATE TABLE bank_product (
    id          BIGSERIAL    PRIMARY KEY,
    customer_id VARCHAR(32)  NOT NULL REFERENCES bank_customer (id),
    type        VARCHAR(32)  NOT NULL CHECK (type IN ('current_account', 'savings_account', 'fund_savings_plan', 'mortgage', 'life_insurance')),
    label       VARCHAR(100) NOT NULL
);
CREATE INDEX bank_product_customer_idx ON bank_product (customer_id);

CREATE TABLE bank_transaction (
    id           BIGSERIAL      PRIMARY KEY,
    account_id   VARCHAR(32)    NOT NULL REFERENCES bank_account (id),
    days_ago     INT            NOT NULL CHECK (days_ago >= 0),
    amount       NUMERIC(12, 2) NOT NULL,
    category     VARCHAR(32)    NOT NULL CHECK (category IN ('salary', 'rent', 'mortgage', 'groceries', 'subscription', 'utilities', 'leisure', 'transfer-internal', 'investment', 'other')),
    counterparty VARCHAR(100)   NOT NULL
);
CREATE INDEX bank_transaction_account_idx ON bank_transaction (account_id);

INSERT INTO bank_customer (id, name, age, headline) VALUES
    ('lena',   'Lena',   22, 'Student, 22'),
    ('tom',    'Tom',    29, 'Young professional, 29'),
    ('marco',  'Marco',  38, 'Family, 38'),
    ('ingrid', 'Ingrid', 58, 'Pre-retirement, 58');

INSERT INTO bank_account (id, customer_id, type, opening_balance) VALUES
    ('lena-current',   'lena',   'current',   150.00),
    ('tom-current',    'tom',    'current',   11500.00),
    ('marco-current',  'marco',  'current',   1800.00),
    ('marco-savings',  'marco',  'savings',   4200.00),
    ('ingrid-current', 'ingrid', 'current',   3500.00),
    ('ingrid-savings', 'ingrid', 'savings',   48000.00),
    ('ingrid-depot',   'ingrid', 'depot',     62000.00);

INSERT INTO bank_product (customer_id, type, label) VALUES
    ('lena',   'current_account',   'Student current account'),
    ('tom',    'current_account',   'Current account'),
    ('marco',  'current_account',   'Current account'),
    ('marco',  'savings_account',   'Savings account'),
    ('marco',  'mortgage',          'Home mortgage'),
    ('ingrid', 'current_account',   'Current account'),
    ('ingrid', 'savings_account',   'Savings account'),
    ('ingrid', 'fund_savings_plan', 'Global equity fund savings plan'),
    ('ingrid', 'life_insurance',    'Life insurance');

-- Lena: irregular student-job pay; rent pushes the account below zero in the oldest and newest month.
INSERT INTO bank_transaction (account_id, days_ago, amount, category, counterparty)
SELECT 'lena-current', t.days_ago, t.amount, t.category, t.counterparty
FROM (VALUES
    (86, -380.00, 'rent',         'Campus Living'),
    (84,  -42.30, 'groceries',    'FreshCorner'),
    (80,   -9.99, 'subscription', 'Streamly'),
    (76,  510.00, 'salary',       'Café Bohne'),
    (72,  -55.10, 'groceries',    'FreshCorner'),
    (68,  -38.00, 'leisure',      'Cinema Nova'),
    (63,  -19.99, 'utilities',    'Mobilo'),
    (58,  350.00, 'other',        'Family transfer'),
    (56, -380.00, 'rent',         'Campus Living'),
    (52,  -48.70, 'groceries',    'FreshCorner'),
    (50,   -9.99, 'subscription', 'Streamly'),
    (45,  280.00, 'salary',       'Café Bohne'),
    (40,  -62.00, 'leisure',      'Club Kanal'),
    (35,  -51.40, 'groceries',    'FreshCorner'),
    (33,  -19.99, 'utilities',    'Mobilo'),
    (27, -380.00, 'rent',         'Campus Living'),
    (24,  -46.20, 'groceries',    'FreshCorner'),
    (20,   -9.99, 'subscription', 'Streamly'),
    (15,  420.00, 'salary',       'Café Bohne'),
    (12,  -45.00, 'leisure',      'Cinema Nova'),
    ( 8,  -39.80, 'groceries',    'FreshCorner'),
    ( 3,  -19.99, 'utilities',    'Mobilo')
) AS t (days_ago, amount, category, counterparty);

-- Tom, Marco and Ingrid repeat the same month three times: day offset within a month + 0, 30 and 60 days.
INSERT INTO bank_transaction (account_id, days_ago, amount, category, counterparty)
SELECT t.account_id, m.base + t.days, t.amount, t.category, t.counterparty
FROM (VALUES
    ('tom-current',    28,  4200.00, 'salary',            'Brightline Software GmbH'),
    ('tom-current',    27, -1150.00, 'rent',              'Lindenhof Apartments'),
    ('tom-current',    25,   -95.40, 'groceries',         'FreshCorner'),
    ('tom-current',    24,   -12.99, 'subscription',      'Streamly'),
    ('tom-current',    22,   -68.00, 'utilities',         'CityPower Energy'),
    ('tom-current',    21,   -39.99, 'utilities',         'FiberNet'),
    ('tom-current',    20,    -9.99, 'subscription',      'CloudBox'),
    ('tom-current',    18,   -82.10, 'groceries',         'FreshCorner'),
    ('tom-current',    14,  -145.00, 'leisure',           'Velo Club'),
    ('tom-current',    11,  -110.30, 'groceries',         'FreshCorner'),
    ('tom-current',     9,  -120.00, 'other',             'Parcelio Online Shop'),
    ('tom-current',     7,   -86.50, 'leisure',           'Cinema Nova'),
    ('tom-current',     3,   -74.90, 'groceries',         'FreshCorner'),
    ('tom-current',     1,  -210.00, 'leisure',           'Trattoria Sole'),

    ('marco-current',  28,  3900.00, 'salary',            'Rheinwerk Logistik GmbH'),
    ('marco-current',  27, -1450.00, 'mortgage',          'Home mortgage'),
    ('marco-current',  26,  -150.00, 'transfer-internal', 'Own savings account'),
    ('marco-savings',  26,   150.00, 'transfer-internal', 'Own current account'),
    ('marco-current',  24,  -230.00, 'groceries',         'FreshCorner'),
    ('marco-current',  20,  -210.00, 'utilities',         'CityPower Energy'),
    ('marco-current',  18,   -24.99, 'subscription',      'Streamly Family'),
    ('marco-current',  15, -1100.00, 'other',             'Sunflower Daycare'),
    ('marco-current',  14,  -210.00, 'groceries',         'FreshCorner'),
    ('marco-current',   9,  -150.00, 'leisure',           'Zoo Lindenthal'),
    ('marco-current',   5,  -210.00, 'groceries',         'FreshCorner'),

    ('ingrid-current', 27,  4600.00, 'salary',            'Nordstadt Hospital'),
    ('ingrid-current', 25,  -400.00, 'investment',        'Global equity fund savings plan'),
    ('ingrid-depot',   25,   400.00, 'investment',        'Global equity fund savings plan'),
    ('ingrid-current', 23,  -180.00, 'groceries',         'FreshCorner'),
    ('ingrid-current', 22,  -120.00, 'other',             'Aurora Life Insurance'),
    ('ingrid-current', 21,  -380.00, 'utilities',         'Elmhurst Housing Association'),
    ('ingrid-current', 20,  -260.00, 'utilities',         'CityPower Energy'),
    ('ingrid-current', 16,   -14.99, 'subscription',      'Daily Courier'),
    ('ingrid-current', 13,  -160.00, 'groceries',         'FreshCorner'),
    ('ingrid-current', 10,  -320.00, 'leisure',           'Opera House'),
    ('ingrid-current',  4,  -170.00, 'groceries',         'FreshCorner')
) AS t (account_id, days, amount, category, counterparty)
CROSS JOIN (VALUES (0), (30), (60)) AS m (base);
