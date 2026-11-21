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
import lombok.Setter;

@Entity
@Table(name = "duel_match")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DuelMatch {

	public enum Status {
		IN_PROGRESS,
		FINISHED,
		ABANDONED
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Enumerated(EnumType.STRING)
	@Column(length = 8, nullable = false)
	private DuelMode mode;

	@Column(name = "categories", columnDefinition = "text[]", nullable = false)
	private String[] categories;

	@Column(name = "user_id", length = 64, nullable = false)
	private String userId;

	@Column(name = "rival_user_id", length = 64)
	private String rivalUserId;

	@Enumerated(EnumType.STRING)
	@Column(length = 16, nullable = false)
	private Status status;

	@Column(name = "score")
	private Integer score;

	@Column(name = "rival_score")
	private Integer rivalScore;

	@Column(name = "xp_gained", nullable = false)
	private int xpGained;

	@Enumerated(EnumType.STRING)
	@Column(length = 8)
	private MatchOutcome outcome;

	@Column(name = "seen_by_player", nullable = false)
	private boolean seenByPlayer;

	@Column(name = "started_at", nullable = false)
	private Instant startedAt;

	@Column(name = "ended_at")
	private Instant endedAt;

	public DuelMatch(DuelMode mode, String[] categories, String userId, String rivalUserId, Instant startedAt) {
		this.mode = mode;
		this.categories = categories;
		this.userId = userId;
		this.rivalUserId = rivalUserId;
		this.status = Status.IN_PROGRESS;
		this.xpGained = 0;
		this.seenByPlayer = false;
		this.startedAt = startedAt;
	}

}
