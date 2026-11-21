package com.collabothon.back.duel;

import java.time.Instant;

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

@Entity
@Table(name = "duel_match")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class DuelMatch {

	enum Status {

		IN_PROGRESS, FINISHED, ABANDONED

	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Enumerated(EnumType.STRING)
	@Column(length = 8, nullable = false)
	private DuelMode mode;

	@Column(name = "category_id", nullable = false)
	private Long categoryId;

	@Column(name = "player_a", length = 64, nullable = false)
	private String playerA;

	@Column(name = "player_b", length = 64)
	private String playerB;

	@Column(name = "bot_name", length = 64)
	private String botName;

	@Column(name = "bot_level")
	private Integer botLevel;

	@Enumerated(EnumType.STRING)
	@Column(length = 16, nullable = false)
	private Status status;

	@Column(name = "score_a")
	private Integer scoreA;

	@Column(name = "score_b")
	private Integer scoreB;

	@Column(name = "xp_a")
	private Integer xpA;

	@Column(name = "xp_b")
	private Integer xpB;

	@Column(name = "elo_delta_a")
	private Integer eloDeltaA;

	@Column(name = "elo_delta_b")
	private Integer eloDeltaB;

	@Column(name = "started_at", nullable = false)
	private Instant startedAt;

	@Column(name = "ended_at")
	private Instant endedAt;

	DuelMatch(DuelMode mode, Long categoryId, String playerA, String playerB, String botName, Integer botLevel,
			Instant startedAt) {
		this.mode = mode;
		this.categoryId = categoryId;
		this.playerA = playerA;
		this.playerB = playerB;
		this.botName = botName;
		this.botLevel = botLevel;
		this.status = Status.IN_PROGRESS;
		this.startedAt = startedAt;
	}

	/** Final scores, awarded XP and Elo deltas; {@code scoreB}, {@code xpB} and the deltas are null when not human-vs-human. */
	void finish(int scoreA, Integer scoreB, int xpA, Integer xpB, Integer eloDeltaA, Integer eloDeltaB,
			Instant endedAt) {
		this.status = Status.FINISHED;
		this.scoreA = scoreA;
		this.scoreB = scoreB;
		this.xpA = xpA;
		this.xpB = xpB;
		this.eloDeltaA = eloDeltaA;
		this.eloDeltaB = eloDeltaB;
		this.endedAt = endedAt;
	}

	/** Ends a match in which no human was connected at the end: no XP, no Elo. */
	void abandon(int scoreA, Integer scoreB, Instant endedAt) {
		this.status = Status.ABANDONED;
		this.scoreA = scoreA;
		this.scoreB = scoreB;
		this.endedAt = endedAt;
	}

}
