package com.collabothon.back.lesson;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Set;
import java.util.function.BiConsumer;
import java.util.function.Consumer;
import java.util.function.Predicate;

import org.junit.jupiter.api.Test;

import com.collabothon.back.lesson.models.LessonJson;
import com.collabothon.back.lesson.validation.LessonRules;

import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

class LessonRulesTests {

	private static final Predicate<String> NO_AUDIO = audio -> false;

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
				{ "persona:student":  { "a1": { "body": "student" } },
				  "level:beginner":   { "s1": { "goal": { "hint": "beginner hint" } }, "q1": { "prompt": "beginner" },
				                        "a1": { "body": "beginner" } } }""");

		// Keys arrive in any order; merging still runs level → persona.
		ObjectNode merged = LessonJson.applyVariants(l, List.of("persona:student", "level:beginner"));

		assertThat(merged.has("variants")).isFalse();
		assertThat(merged.at("/steps/0/goal/hint").asString()).isEqualTo("beginner hint");
		// Deep merge: the sibling field of the overridden one survives.
		assertThat(merged.at("/steps/0/goal/condition/max").asInt()).isEqualTo(-100);
		assertThat(merged.at("/steps/1/prompt").asString()).isEqualTo("beginner");
		assertThat(merged.at("/steps/2/body").asString()).isEqualTo("student");
		// The base lesson is untouched.
		assertThat(l.at("/steps/1/prompt").asString()).isEqualTo("base");

		ObjectNode studentOnly = LessonJson.applyVariants(l, List.of("persona:student"));
		assertThat(studentOnly.at("/steps/2/body").asString()).isEqualTo("student");
	}

	@Test
	void validationRejectsBrokenContent() {
		Set<String> glossary = Set.of("leverage");
		LessonRules.validate(lesson("{}"), glossary, NO_AUDIO);

		assertThatThrownBy(() -> LessonRules.validate(lesson("{}"), Set.of(), NO_AUDIO))
			.hasMessageContaining("concept 'leverage'");
		assertThatThrownBy(() -> LessonRules.validate(lesson("""
				{ "level:advanced": { "q1": { "correctIndex": 0 } } }"""), glossary, NO_AUDIO))
			.hasMessageContaining("answer fields");
		assertThatThrownBy(() -> LessonRules.validate(lesson("""
				{ "persona:family": { "q1": { "prompt": "x" } } }"""), glossary, NO_AUDIO))
			.hasMessageContaining("only override action");
		assertThatThrownBy(() -> LessonRules.validate(lesson("""
				{ "level:beginner": { "zz": { "prompt": "x" } } }"""), glossary, NO_AUDIO))
			.hasMessageContaining("unknown step 'zz'");
		// Plain language is gone (lesson-video-mode-spec §9).
		assertThatThrownBy(() -> LessonRules.validate(lesson("""
				{ "lang:plain": { "q1": { "prompt": "x" } } }"""), glossary, NO_AUDIO))
			.hasMessageContaining("unknown variant 'lang:plain'");
	}

	@Test
	void phasesAreAllOrNothingInOrderAndDecideOnlyActs() {
		ObjectNode ok = (ObjectNode) json.readTree("""
				{ "id": "p-1", "xp": 10, "steps": [
				  { "type": "text", "id": "t1", "phase": "learn", "body": "hi" },
				  { "type": "quiz", "id": "q1", "phase": "challenge", "prompt": "p", "options": ["True", "False"], "correctIndex": 1,
				    "explanation": "e", "chart": { "series": [1, 2, 3], "labels": ["a", "b", "c"], "unit": "%" } },
				  { "type": "slider-chart", "id": "s1", "phase": "you", "prompt": "p", "model": "countryMix",
				    "params": { "homeShare": { "label": "l", "min": 0, "max": 100, "step": 5, "value": 50, "fromBank": "europeShare" } },
				    "output": { "label": "o", "unit": "%" }, "goal": { "condition": { "of": "output", "min": -100 }, "hint": "h" } },
				  { "type": "action", "id": "a1", "phase": "decide", "body": "b", "bodyNoData": "n" } ] }""");
		assertThatCode(() -> LessonRules.validate(ok, Set.of(), NO_AUDIO)).doesNotThrowAnyException();

		BiConsumer<Consumer<ObjectNode>, String> fails = (breakIt, message) -> {
			ObjectNode l = ok.deepCopy();
			breakIt.accept(l);
			assertThatThrownBy(() -> LessonRules.validate(l, Set.of(), NO_AUDIO)).hasMessageContaining(message);
		};
		fails.accept(l -> ((ObjectNode) l.at("/steps/0")).remove("phase"), "every step has a phase or none");
		fails.accept(l -> ((ObjectNode) l.at("/steps/1")).put("phase", "you"), "a phased lesson needs a 'challenge' step");
		fails.accept(l -> ((ObjectNode) l.at("/steps/2")).put("phase", "learn"), "comes after a later phase");
		fails.accept(l -> ((ObjectNode) l.at("/steps/2")).put("phase", "decide"), "decide phase holds only action steps");
		fails.accept(l -> ((ObjectNode) l.at("/steps/1/chart")).putArray("labels").add("a"), "chart labels must match");
		fails.accept(l -> ((ObjectNode) l.at("/steps/2/params/homeShare")).put("fromBank", "salary"), "unknown bank number 'salary'");
	}
}
