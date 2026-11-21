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

/** One answered or timed-out question of a player in a match. */
@Entity
@Table(name = "duel_answer")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class DuelAnswer {

	enum Outcome {

		ANSWERED, TIMEOUT

	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "match_id", nullable = false)
	private Long matchId;

	@Column(name = "user_id", length = 64, nullable = false)
	private String userId;

	@Column(name = "question_id", nullable = false)
	private Long questionId;

	@Column(nullable = false)
	private int position;

	@Column(name = "chosen_index")
	private Integer chosenIndex;

	@Column(nullable = false)
	private boolean correct;

	@Enumerated(EnumType.STRING)
	@Column(length = 8, nullable = false)
	private Outcome outcome;

	@Column(name = "ms_taken")
	private Integer msTaken;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	DuelAnswer(Long matchId, String userId, Long questionId, int position, Integer chosenIndex, boolean correct,
			Outcome outcome, Integer msTaken, Instant createdAt) {
		this.matchId = matchId;
		this.userId = userId;
		this.questionId = questionId;
		this.position = position;
		this.chosenIndex = chosenIndex;
		this.correct = correct;
		this.outcome = outcome;
		this.msTaken = msTaken;
		this.createdAt = createdAt;
	}

}
