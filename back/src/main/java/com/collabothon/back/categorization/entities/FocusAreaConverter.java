package com.collabothon.back.categorization.entities;

import jakarta.persistence.AttributeConverter;

import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.WireNames;

class FocusAreaConverter implements AttributeConverter<FocusArea, String> {

	@Override
	public String convertToDatabaseColumn(FocusArea area) {
		return area == null ? null : area.wire();
	}

	@Override
	public FocusArea convertToEntityAttribute(String wire) {
		return wire == null ? null : WireNames.fromWire(FocusArea.class, wire);
	}

}
