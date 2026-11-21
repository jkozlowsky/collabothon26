package com.collabothon.back.entities.duel;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * The player's answer to one question of a match (V17 {@code duel_answer}), timeouts included, plus the simulated
 * rival's answer to the same question. Written once, never updated.
 */
@Entity
@Table(name = "duel_answer")
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class DuelAnswer {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id", nullable = false, updatable = false)
	private Long id;

	@Column(name = "match_id", nullable = false, updatable = false)
	private Long matchId;

	@Column(name = "position", nullable = false, updatable = false)
	private int position;

	@Column(name = "question_id", nullable = false, length = 64, updatable = false)
	private String questionId;

	@Column(name = "category", nullable = false, length = 32, updatable = false)
	private String category;

	/** Null when the player timed out. */
	@Convert(converter = ChosenAnswerJsonConverter.class)
	@Column(name = "chosen_answer", updatable = false, columnDefinition = "text")
	private ChosenAnswer chosenAnswer;

	@Column(name = "correct", nullable = false, updatable = false)
	private boolean correct;

	@Enumerated(EnumType.STRING)
	@Column(name = "outcome", nullable = false, length = 8, updatable = false)
	private AnswerOutcome outcome;

	@Column(name = "ms_taken", updatable = false)
	private Integer msTaken;

	/** Null in SOLO matches. */
	@Column(name = "rival_correct", updatable = false)
	private Boolean rivalCorrect;

	/** When the rival's answer becomes visible; null in SOLO matches. */
	@Column(name = "rival_answer_at", updatable = false)
	private Instant rivalAnswerAt;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt;

	public boolean isTimedOut() {
		return outcome == AnswerOutcome.TIMEOUT;
	}

	public boolean isRivalCorrect() {
		return Boolean.TRUE.equals(rivalCorrect);
	}

	/** Whether the rival's answer to this question is visible at {@code now}. */
	public boolean isRivalAnsweredAt(Instant now) {
		return rivalAnswerAt != null && !now.isBefore(rivalAnswerAt);
	}

}
