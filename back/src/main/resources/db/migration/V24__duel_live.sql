-- Live duel (human vs human): the two players' duel_match rows point at each other.
ALTER TABLE duel_match
    ADD COLUMN opponent_match_id BIGINT REFERENCES duel_match (id) ON DELETE SET NULL;

CREATE INDEX idx_duel_match_opponent ON duel_match (opponent_match_id);
