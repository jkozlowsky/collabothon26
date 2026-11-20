-- Example domain: lessons with quiz questions (+ sample data for the demo app).
CREATE TABLE lesson (
    id       BIGSERIAL PRIMARY KEY,
    position INT          NOT NULL,
    emoji    VARCHAR(8)   NOT NULL,
    title    VARCHAR(200) NOT NULL,
    summary  TEXT         NOT NULL,
    xp       INT          NOT NULL
);

CREATE TABLE question (
    id            BIGSERIAL PRIMARY KEY,
    lesson_id     BIGINT NOT NULL REFERENCES lesson (id) ON DELETE CASCADE,
    position      INT    NOT NULL,
    prompt        TEXT   NOT NULL,
    options       TEXT[] NOT NULL,
    correct_index INT    NOT NULL,
    explanation   TEXT   NOT NULL
);

INSERT INTO lesson (id, position, emoji, title, summary, xp) VALUES
    (1, 1, '🛟', 'Emergency fund', 'How much to keep for a rainy day, and where.', 50),
    (2, 2, '📈', 'Compound interest', 'Why time is your best investor.', 70),
    (3, 3, '🎈', 'Inflation', 'What happens to money that just sits there.', 60);
SELECT setval('lesson_id_seq', 3);

INSERT INTO question (lesson_id, position, prompt, options, correct_index, explanation) VALUES
    (1, 1, 'How many months of expenses should an emergency fund usually cover?',
        ARRAY['1 month', '3–6 months', '5 years'], 1,
        '3–6 months of expenses lets you survive a job loss or a broken car without taking on debt.'),
    (1, 2, 'Where is the best place to keep an emergency fund?',
        ARRAY['In a single company''s shares', 'In a savings account with instant access', 'In crypto'], 1,
        'An emergency fund must be safe and available right away, not maximally profitable.'),
    (2, 1, 'You deposit €1,000 at 10% a year. How much do you have after 2 years with yearly compounding?',
        ARRAY['€1,200', '€1,210', '€1,100'], 1,
        'In year two you also earn interest on year one''s interest: 1,000 × 1.1 × 1.1 = €1,210.'),
    (2, 2, 'What increases the effect of compound interest the most?',
        ARRAY['A long investment horizon', 'Withdrawing profits often', 'Keeping cash at home'], 0,
        'The longer interest earns interest, the faster your capital grows.'),
    (3, 1, 'Inflation is 5% and your deposit pays 3%. What happens to your money?',
        ARRAY['You gain 3% in real terms', 'You lose about 2% in real terms', 'Nothing changes'], 1,
        'Real return ≈ interest rate minus inflation: 3% − 5% ≈ −2%.'),
    (3, 2, 'What does inflation mean?',
        ARRAY['Prices rise in general', 'Prices in shops fall', 'Your currency gains value'], 0,
        'When prices rise, the same amount of money buys less.');
