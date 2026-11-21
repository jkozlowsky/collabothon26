package com.collabothon.back.dto.converters.duel;

import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Component;

import com.collabothon.back.dto.duel.DuelQuestionDto;
import com.collabothon.back.entities.duel.DuelQuestion;

import tools.jackson.databind.node.ObjectNode;

/**
 * Turns a duel question into what the player sees before answering: the step without the fields that give the answer
 * away. The review sends the full step instead.
 */
@Component
public class DuelQuestionConverter {

	private static final String EXPLANATION = "explanation";

	private static final Map<String, Set<String>> ANSWER_FIELDS_BY_TYPE = Map.of(
			"quiz", Set.of("correctIndex", EXPLANATION),
			"predict", Set.of("answer", "reveal", "tolerance", EXPLANATION),
			"chart", Set.of("answer", "tolerance", EXPLANATION));

	private static final Set<String> DEFAULT_ANSWER_FIELDS = Set.of(EXPLANATION);

	public DuelQuestionDto toDto(int index, DuelQuestion question, long deadline, long timeLimitMs) {
		return new DuelQuestionDto(index, question.category(), withoutAnswerFields(question.step()), deadline,
				timeLimitMs);
	}

	public ObjectNode withoutAnswerFields(ObjectNode step) {
		ObjectNode copy = step.deepCopy();
		String type = copy.path("type").asString();
		copy.remove(ANSWER_FIELDS_BY_TYPE.getOrDefault(type, DEFAULT_ANSWER_FIELDS));
		return copy;
	}

}
