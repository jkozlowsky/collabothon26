package com.collabothon.back.categorization.entities;

import jakarta.persistence.AttributeConverter;

import com.collabothon.back.categorization.enums.CheckCategory;
import com.collabothon.back.categorization.enums.WireNames;

class CheckCategoryConverter implements AttributeConverter<CheckCategory, String> {

	@Override
	public String convertToDatabaseColumn(CheckCategory category) {
		return category == null ? null : category.wire();
	}

	@Override
	public CheckCategory convertToEntityAttribute(String wire) {
		return wire == null ? null : WireNames.fromWire(CheckCategory.class, wire);
	}

}
