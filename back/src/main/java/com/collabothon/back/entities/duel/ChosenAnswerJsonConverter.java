package com.collabothon.back.entities.duel;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import tools.jackson.databind.json.JsonMapper;

// Its own mapper, not the app's: what is stored must not follow the web JSON settings.
@Converter
public class ChosenAnswerJsonConverter implements AttributeConverter<ChosenAnswer, String> {

	private static final JsonMapper JSON = JsonMapper.builder().build();

	@Override
	public String convertToDatabaseColumn(ChosenAnswer answer) {
		if (answer == null) {
			return null;
		}
		return JSON.writeValueAsString(answer);
	}

	@Override
	public ChosenAnswer convertToEntityAttribute(String json) {
		if (json == null) {
			return null;
		}
		return JSON.readValue(json, ChosenAnswer.class);
	}

}
