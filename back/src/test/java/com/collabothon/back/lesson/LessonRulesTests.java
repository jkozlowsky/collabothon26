package com.collabothon.back.lesson;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.collabothon.back.lesson.services.LessonRules;

import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

class LessonRulesTests {

	private final JsonMapper json = JsonMapper.builder().build();

	private ObjectNode lesson(String variants) {
		return (ObjectNode) json.readTree("""
				{ "id": "x-1", "xp": 10,
				  "steps": [
				    { "type": "slider-chart", "id": "s1", "model": "leverage",
				      "goal": { "hint": "base hint", "condition": { "of": "output", "max": -100 } } },
				    { "type": "quiz", "id": "q1", "prompt": "base", "options": ["a", "b"], "correctIndex": 1,
				      "explanation": "[[leverage]]" },
				    { "type": "action", "id": "a1", "body": "base", "bodyNoData": "none" }
				  ],
				  "variants": %s }""".formatted(variants));
	}

	@Test
	void mergesVariantsInFixedOrderDeeplyAndLaterWins() {
		ObjectNode l = lesson("""
				{ "lang:plain":       { "q1": { "prompt": "plain" }, "a1": { "body": "plain" } },
				  "persona:student":  { "a1": { "body": "student" } },
				  "level:beginner":   { "s1": { "goal": { "hint": "beginner hint" } }, "q1": { "prompt": "beginner" } } }""");

		// Keys arrive in any order; merging still runs level → persona → lang.
		ObjectNode merged = LessonRules.applyVariants(l, List.of("lang:plain", "persona:student", "level:beginner"));

		assertThat(merged.has("variants")).isFalse();
		assertThat(merged.at("/steps/0/goal/hint").asString()).isEqualTo("beginner hint");
		// Deep merge: the sibling field of the overridden one survives.
		assertThat(merged.at("/steps/0/goal/condition/max").asInt()).isEqualTo(-100);
		assertThat(merged.at("/steps/1/prompt").asString()).isEqualTo("plain");
		assertThat(merged.at("/steps/2/body").asString()).isEqualTo("plain");
		// The base lesson is untouched.
		assertThat(l.at("/steps/1/prompt").asString()).isEqualTo("base");

		ObjectNode studentOnly = LessonRules.applyVariants(l, List.of("persona:student"));
		assertThat(studentOnly.at("/steps/2/body").asString()).isEqualTo("student");
	}

	@Test
	void validationRejectsBrokenContent() {
		Set<String> glossary = Set.of("leverage");
		LessonRules.validate(lesson("{}"), glossary);

		assertThatThrownBy(() -> LessonRules.validate(lesson("{}"), Set.of()))
			.hasMessageContaining("concept 'leverage'");
		assertThatThrownBy(() -> LessonRules.validate(lesson("""
				{ "lang:plain": { "q1": { "correctIndex": 0 } } }"""), glossary))
			.hasMessageContaining("answer fields");
		assertThatThrownBy(() -> LessonRules.validate(lesson("""
				{ "persona:family": { "q1": { "prompt": "x" } } }"""), glossary))
			.hasMessageContaining("only override action");
		assertThatThrownBy(() -> LessonRules.validate(lesson("""
				{ "lang:plain": { "zz": { "prompt": "x" } } }"""), glossary))
			.hasMessageContaining("unknown step 'zz'");
	}

}
