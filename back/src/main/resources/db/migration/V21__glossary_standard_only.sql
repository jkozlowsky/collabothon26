-- The glossary shows only the standard definition: drop the "in plain words" texts and the per-user choice between them.
-- V16 still inserts definition_plain; editing an applied migration would break Flyway's checksum, so the column goes here.

ALTER TABLE glossary_term DROP COLUMN definition_plain;

DROP TABLE glossary_preference;
