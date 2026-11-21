package com.collabothon.back.duel;

import java.io.Serializable;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** A question slot of a match together with the shuffled option order the players saw. */
@Entity
@Table(name = "duel_match_question")
@IdClass(DuelMatchQuestion.Key.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class DuelMatchQuestion {

	record Key(Long matchId, int position) implements Serializable {
	}

	@Id
	@Column(name = "match_id", nullable = false)
	private Long matchId;

	@Id
	@Column(nullable = false)
	private int position;

	@Column(name = "question_id", nullable = false)
	private Long questionId;

	@Column(name = "option_order", nullable = false)
	private List<Integer> optionOrder;

	DuelMatchQuestion(Long matchId, int position, Long questionId, List<Integer> optionOrder) {
		this.matchId = matchId;
		this.position = position;
		this.questionId = questionId;
		this.optionOrder = List.copyOf(optionOrder);
	}

}
