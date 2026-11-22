package com.collabothon.back.entities.duel;

import java.time.Instant;
import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.collabothon.back.common.consts.UserConsts;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** One player's side of one duel. */
@Entity
@Table(name = "duel_match")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DuelMatch {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id", nullable = false, updatable = false)
	private Long id;

	@Enumerated(EnumType.STRING)
	@Column(name = "mode", nullable = false, length = 8, updatable = false)
	private DuelMode mode;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(name = "categories", nullable = false, updatable = false, columnDefinition = "text[]")
	private List<String> categories;

	@Column(name = "user_id", nullable = false, length = UserConsts.MAX_USER_ID_LENGTH, updatable = false)
	private String userId;

	@Column(name = "rival_user_id", length = UserConsts.MAX_USER_ID_LENGTH, updatable = false)
	private String rivalUserId;

	/** The other player's row in a live duel; null against the simulated rival and in SOLO. */
	@Column(name = "opponent_match_id")
	private Long opponentMatchId;

	@Enumerated(EnumType.STRING)
	@Column(name = "status", nullable = false, length = 16)
	private MatchStatus status;

	@Column(name = "score")
	private Integer score;

	@Column(name = "rival_score")
	private Integer rivalScore;

	@Column(name = "xp_gained", nullable = false)
	private int xpGained;

	@Enumerated(EnumType.STRING)
	@Column(name = "outcome", length = 8)
	private MatchOutcome outcome;

	@Column(name = "seen_by_player", nullable = false)
	private boolean seenByPlayer;

	@Column(name = "started_at", nullable = false, updatable = false)
	private Instant startedAt;

	@Column(name = "ended_at")
	private Instant endedAt;

	public static DuelMatch start(DuelMode mode, List<String> categories, String userId, String rivalUserId,
			Instant startedAt) {
		DuelMatch match = new DuelMatch();
		match.mode = mode;
		match.categories = List.copyOf(categories);
		match.userId = userId;
		match.rivalUserId = rivalUserId;
		match.status = MatchStatus.IN_PROGRESS;
		match.startedAt = startedAt;
		return match;
	}

	public boolean isFinished() {
		return status == MatchStatus.FINISHED;
	}

	public boolean isLive() {
		return opponentMatchId != null;
	}

	public void linkOpponent(long opponentMatchId) {
		this.opponentMatchId = opponentMatchId;
	}

	public boolean hasRival() {
		return mode == DuelMode.HUMAN;
	}

	public boolean hasSimulatedRival() {
		return hasRival() && !isLive();
	}

	public boolean hasPlayerScore() {
		return score != null;
	}

	/** Final as soon as the player has answered everything, even while the rival still plays. */
	public void recordPlayerScore(int score, int xpGained) {
		this.score = score;
		this.xpGained = xpGained;
	}

	public void finish(MatchOutcome outcome, int score, Integer rivalScore, Instant endedAt) {
		this.status = MatchStatus.FINISHED;
		this.outcome = outcome;
		this.score = score;
		this.rivalScore = rivalScore;
		this.endedAt = endedAt;
	}

	public void markSeen() {
		this.seenByPlayer = true;
	}

}
