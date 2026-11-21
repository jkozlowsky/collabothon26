package com.collabothon.back.lesson;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Graded steps per glossary concept: answered right on the first try / seen. */
@Entity
@IdClass(ConceptKnowledgeId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ConceptKnowledge {

	@Id
	private String userId;

	@Id
	private String concept;

	private int correct;

	private int attempts;

	ConceptKnowledge(String userId, String concept) {
		this.userId = userId;
		this.concept = concept;
	}

	void record(boolean correctFirstTry) {
		attempts++;
		if (correctFirstTry) {
			correct++;
		}
	}

}
