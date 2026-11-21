package com.collabothon.back.entities.glossary;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "glossary_preference")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GlossaryPreference {

	@Id
	@Column(name = "user_id", nullable = false, length = 64)
	private String userId;

	@Column(name = "language_level", nullable = false, length = 16)
	private String languageLevel;

	@Builder
	public GlossaryPreference(String userId, String languageLevel) {
		this.userId = userId;
		this.languageLevel = languageLevel;
	}
}
