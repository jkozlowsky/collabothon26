package com.collabothon.back.lesson.validation;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Predicate;

import com.collabothon.back.lesson.consts.LessonConsts;
import com.collabothon.back.lesson.models.LessonJson;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.JsonNodeFactory;
import tools.jackson.databind.node.ObjectNode;

// Run for every content file at startup; the first problem stops it, so the order of the checks matters.
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class LessonRules {

	public static void validate(ObjectNode lesson, Set<String> glossary, Predicate<String> audioExists) {
		String id = lesson.path("id").asString("");
		ContentCheck check = new ContentCheck(id, "");
		check.require(!id.isBlank(), "missing id");
		check.require(lesson.path("xp").asInt(0) > 0, "xp must be positive");

		checkSteps(check, lesson);
		checkPhases(check, lesson);
		checkConceptsInGlossary(check, lesson, glossary);
		checkVariants(check, lesson);
		if (lesson.hasNonNull("video")) {
			SceneRules.validate(check, lesson, audioExists);
		}
	}

	private static void checkSteps(ContentCheck check, JsonNode lesson) {
		Set<String> stepIds = new HashSet<>();
		for (JsonNode step : lesson.path("steps")) {
			String id = step.path("id").asString("");
			String type = step.path("type").asString("");
			check.require(!id.isBlank() && !stepIds.contains(id), "missing or duplicate step id '" + id + "'");
			stepIds.add(id);
			check.require(LessonConsts.STEP_TYPES.contains(type), "step " + id + " has unknown type '" + type + "'");
			StepRules.validate(check.within("step " + id + ": "), type, step);
		}
		check.require(!stepIds.isEmpty(), "no steps");
	}

	private static void checkPhases(ContentCheck check, JsonNode lesson) {
		List<JsonNode> steps = lesson.path("steps").valueStream().toList();
		long phased = steps.stream().filter(step -> step.has("phase")).count();
		if (phased == 0) {
			return;
		}
		check.require(phased == steps.size(), "either every step has a phase or none does");
		checkPhaseOrder(check, steps);
		checkRequiredPhases(check, steps);
	}

	private static void checkPhaseOrder(ContentCheck check, List<JsonNode> steps) {
		int lastRank = 0;
		for (JsonNode step : steps) {
			String id = step.path("id").asString("");
			String phase = step.path("phase").asString("");
			int rank = LessonConsts.PHASES.indexOf(phase);
			check.require(rank >= 0, "step " + id + " has unknown phase '" + phase + "'");
			check.require(rank >= lastRank, "step " + id + " (" + phase + ") comes after a later phase");
			check.require(!LessonConsts.DECIDE.equals(phase) || LessonConsts.ACTION.equals(step.path("type").asString()),
					"step " + id + ": the decide phase holds only action steps");
			lastRank = rank;
		}
	}

	private static void checkRequiredPhases(ContentCheck check, List<JsonNode> steps) {
		List<String> used = steps.stream().map(step -> step.path("phase").asString("")).toList();
		for (String phase : LessonConsts.REQUIRED_PHASES) {
			check.require(used.contains(phase), "a phased lesson needs a '" + phase + "' step");
		}
	}

	private static void checkConceptsInGlossary(ContentCheck check, JsonNode lesson, Set<String> glossary) {
		for (String concept : LessonJson.concepts(lesson)) {
			check.require(glossary.contains(concept), "concept '" + concept + "' is not in the glossary");
		}
	}

	private static void checkVariants(ContentCheck check, JsonNode lesson) {
		for (Map.Entry<String, JsonNode> variant : lesson.path("variants").properties()) {
			String key = variant.getKey();
			check.require(LessonConsts.VARIANT_KEYS.contains(key), "unknown variant '" + key + "'");
			for (Map.Entry<String, JsonNode> override : variant.getValue().properties()) {
				checkOverride(check, lesson, key, override);
			}
		}
	}

	private static void checkOverride(ContentCheck check, JsonNode lesson, String key,
			Map.Entry<String, JsonNode> override) {
		String stepId = override.getKey();
		Optional<ObjectNode> step = LessonJson.findStep(lesson, stepId);
		check.require(step.isPresent(), key + " overrides unknown step '" + stepId + "'");
		ObjectNode base = step.orElseThrow();
		check.require(!key.startsWith(LessonConsts.PERSONA_PREFIX) || LessonConsts.ACTION.equals(base.path("type").asString()),
				key + " may only override action steps, not " + stepId);
		JsonNode patch = override.getValue();
		check.require(!patch.has("id") && !patch.has("type"), key + " must not change the id or type of " + stepId);
		ObjectNode merged = base.deepCopy();
		LessonJson.merge(merged, patch);
		check.require(answerFields(merged).equals(answerFields(base)),
				key + " must not change answer fields of " + stepId);
	}

	private static JsonNode answerFields(JsonNode step) {
		ObjectNode fields = JsonNodeFactory.instance.objectNode();
		for (String name : LessonConsts.ANSWER_FIELDS) {
			fields.set(name, step.path(name));
		}
		ArrayNode buckets = fields.putArray("buckets");
		step.path("items").forEach(item -> buckets.add(item.path("bucket")));
		ArrayNode series = fields.putArray("series");
		step.path("choices").forEach(choice -> series.add(choice.path("series")));
		return fields;
	}

}
