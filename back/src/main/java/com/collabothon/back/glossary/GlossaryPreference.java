package com.collabothon.back.glossary;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class GlossaryPreference {

	@Id
	private String userId;

	private String languageLevel;

}
