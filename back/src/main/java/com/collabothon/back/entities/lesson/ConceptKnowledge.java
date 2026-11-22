package com.collabothon.back.entities.lesson;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "concept_knowledge")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ConceptKnowledge {

	@EmbeddedId
	private ConceptKnowledgeId id;

	@Column(name = "correct", nullable = false)
	private int correct;

	@Column(name = "attempts", nullable = false)
	private int attempts;

}
