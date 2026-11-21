package com.collabothon.back.entities.lesson;

import java.io.Serializable;
import java.util.Objects;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class ConceptKnowledgeId implements Serializable {

	@Column(name = "user_id", nullable = false, length = 64)
	private String userId;

	@Column(name = "concept", nullable = false, length = 64)
	private String concept;

	@Override
	public boolean equals(Object o) {
		if (this == o) {
			return true;
		}
		if (o == null || getClass() != o.getClass()) {
			return false;
		}
		ConceptKnowledgeId that = (ConceptKnowledgeId) o;
		return Objects.equals(userId, that.userId) && Objects.equals(concept, that.concept);
	}

	@Override
	public int hashCode() {
		return Objects.hash(userId, concept);
	}
}
