package com.collabothon.back.dto.converters.duel;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

class DuelQuestionConverterTests {

	private final DuelQuestionConverter converter = new DuelQuestionConverter();

	private final JsonMapper json = JsonMapper.builder().build();

	@Test
	void quizLosesCorrectIndexAndExplanation() {
		ObjectNode step = json.createObjectNode().put("type", "quiz").put("prompt", "p").put("correctIndex", 1)
			.put("explanation", "e");

		ObjectNode stripped = converter.withoutAnswerFields(step);

		assertThat(stripped.propertyNames()).containsExactlyInAnyOrder("type", "prompt");
		assertThat(step.has("correctIndex")).as("the content step is not modified").isTrue();
	}

	@Test
	void predictLosesAnswerRevealToleranceAndExplanation() {
		ObjectNode step = json.createObjectNode().put("type", "predict").put("answer", 1).put("reveal", "r")
			.put("tolerance", 1).put("explanation", "e");

		assertThat(converter.withoutAnswerFields(step).propertyNames()).containsExactly("type");
	}

	@Test
	void chartKeepsRevealButLosesAnswerToleranceAndExplanation() {
		ObjectNode step = json.createObjectNode().put("type", "chart").put("answer", 1).put("tolerance", 1)
			.put("explanation", "e").put("model", "leverage");

		assertThat(converter.withoutAnswerFields(step).propertyNames()).containsExactlyInAnyOrder("type", "model");
	}

	@Test
	void otherTypesLoseOnlyTheExplanation() {
		ObjectNode step = json.createObjectNode().put("type", "sort").put("explanation", "e");
		step.putArray("items").add("a");

		assertThat(converter.withoutAnswerFields(step).propertyNames()).containsExactlyInAnyOrder("type", "items");
	}

}
