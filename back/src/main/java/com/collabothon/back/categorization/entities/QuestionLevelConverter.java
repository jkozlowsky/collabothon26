package com.collabothon.back.categorization.entities;

import jakarta.persistence.AttributeConverter;

import com.collabothon.back.categorization.enums.QuestionLevel;
import com.collabothon.back.categorization.enums.WireNames;

class QuestionLevelConverter implements AttributeConverter<QuestionLevel, String> {

	@Override
	public String convertToDatabaseColumn(QuestionLevel level) {
		return level == null ? null : level.wire();
	}

	@Override
	public QuestionLevel convertToEntityAttribute(String wire) {
		return wire == null ? null : WireNames.fromWire(QuestionLevel.class, wire);
	}

}
