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
@Table(name = "duel_answer")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DuelAnswer {

	public enum Outcome {
		ANSWERED,
		TIMEOUT
	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "match_id", nullable = false)
	private Long matchId;

	@Column(name = "position", nullable = false)
	private int position;

	@Column(name = "question_id", length = 64, nullable = false)
	private String questionId;

	@Column(name = "category", length = 32, nullable = false)
	private String category;

	@Column(name = "chosen_answer", columnDefinition = "text")
	private String chosenAnswer;

	@Column(name = "correct", nullable = false)
	private boolean correct;

	@Enumerated(EnumType.STRING)
	@Column(length = 8, nullable = false)
	private Outcome outcome;

	@Column(name = "ms_taken")
	private Integer msTaken;

	@Column(name = "rival_correct")
	private Boolean rivalCorrect;

	@Column(name = "rival_answer_at")
	private Instant rivalAnswerAt;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	public DuelAnswer(Long matchId, int position, String questionId, String category,
			String chosenAnswer, boolean correct, Outcome outcome, Integer msTaken,
			Boolean rivalCorrect, Instant rivalAnswerAt, Instant createdAt) {
		this.matchId = matchId;
		this.position = position;
		this.questionId = questionId;
		this.category = category;
		this.chosenAnswer = chosenAnswer;
		this.correct = correct;
		this.outcome = outcome;
		this.msTaken = msTaken;
		this.rivalCorrect = rivalCorrect;
		this.rivalAnswerAt = rivalAnswerAt;
		this.createdAt = createdAt;
	}

}
