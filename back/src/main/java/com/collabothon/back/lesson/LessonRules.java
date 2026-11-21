package com.collabothon.back.lesson;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.JsonNodeFactory;
import tools.jackson.databind.node.ObjectNode;

/**
 * Pure rules for lesson JSON: variant merging (F5) and the startup validation of content files.
 * The backend knows step types only as far as validation needs; the frontend renders them.
 */
final class LessonRules {

	static final Set<String> STEP_TYPES = Set.of("text", "chat", "quiz", "match", "sort", "predict", "slider-chart",
			"scenario", "action");

	/** Steps with a right answer; a wrong first try sends them to the repeat queue. */
	static final Set<String> GRADED = Set.of("quiz", "match", "sort");

	static final Set<String> VARIANT_KEYS = Set.of("level:beginner", "level:advanced", "persona:student",
			"persona:family", "persona:pre-retirement", "lang:plain");

	/** Variants apply in this order, later wins: base → level → persona → lang. */
	private static final List<String> VARIANT_ORDER = List.of("level:", "persona:", "lang:");

	/** slider-chart models implemented in front/src/lib/models.ts. */
	static final Set<String> MODELS = Set.of("drawdownRecovery", "leverage", "oneCompanyCrash", "realValue",
			"installmentCost", "countryMix");

	/** [[concept]] or [[concept|shown text]] inside any text field. */
	private static final Pattern CONCEPT_REF = Pattern.compile("\\[\\[([a-z0-9-]+)(?:\\|[^\\]]*)?]]");

	private LessonRules() {
	}

	/**
	 * Returns a copy of the lesson with the variants named in {@code keys} merged into its steps, without the
	 * {@code variants} field. Objects merge deeply, arrays and values are replaced.
	 */
	static ObjectNode applyVariants(ObjectNode lesson, Collection<String> keys) {
		ObjectNode out = lesson.deepCopy();
		JsonNode variants = out.remove("variants");
		if (variants == null) {
			return out;
		}
		for (String prefix : VARIANT_ORDER) {
			for (String key : keys) {
				if (key.startsWith(prefix) && variants.has(key)) {
					variants.get(key).properties().forEach(e -> merge(step(out, e.getKey()), e.getValue()));
				}
			}
		}
		return out;
	}

	static void merge(ObjectNode target, JsonNode patch) {
		for (var e : patch.properties()) {
			if (target.get(e.getKey()) instanceof ObjectNode current && e.getValue().isObject()) {
				merge(current, e.getValue());
			}
			else {
				target.set(e.getKey(), e.getValue().deepCopy());
			}
		}
	}

	static ObjectNode step(JsonNode lesson, String stepId) {
		for (JsonNode s : lesson.path("steps")) {
			if (stepId.equals(s.path("id").asString(""))) {
				return (ObjectNode) s;
			}
		}
		throw new IllegalArgumentException("no step '" + stepId + "'");
	}

	/** Fails with a message naming the lesson and the problem. Run for every content file at startup. */
	static void validate(ObjectNode lesson, Set<String> glossary) {
		String id = lesson.path("id").asString("");
		check(!id.isBlank(), id, "missing id");
		check(lesson.path("xp").asInt(0) > 0, id, "xp must be positive");

		Set<String> stepIds = new HashSet<>();
		for (JsonNode step : lesson.path("steps")) {
			String sid = step.path("id").asString("");
			String type = step.path("type").asString("");
			check(!sid.isBlank() && stepIds.add(sid), id, "missing or duplicate step id '" + sid + "'");
			check(STEP_TYPES.contains(type), id, "step " + sid + " has unknown type '" + type + "'");
			validateStep(id, sid, type, step);
		}
		check(!stepIds.isEmpty(), id, "no steps");

		for (String concept : concepts(lesson)) {
			check(glossary.contains(concept), id, "concept '" + concept + "' is not in the glossary");
		}

		for (var variant : lesson.path("variants").properties()) {
			String key = variant.getKey();
			check(VARIANT_KEYS.contains(key), id, "unknown variant '" + key + "'");
			for (var override : variant.getValue().properties()) {
				String sid = override.getKey();
				check(stepIds.contains(sid), id, key + " overrides unknown step '" + sid + "'");
				ObjectNode base = step(lesson, sid);
				check(!key.startsWith("persona:") || "action".equals(base.path("type").asString()), id,
						key + " may only override action steps, not " + sid);
				check(!override.getValue().has("id") && !override.getValue().has("type"), id,
						key + " must not change the id or type of " + sid);
				ObjectNode merged = base.deepCopy();
				merge(merged, override.getValue());
				check(answerFields(merged).equals(answerFields(base)), id,
						key + " must not change answer fields of " + sid);
			}
		}
	}

	private static void validateStep(String lesson, String sid, String type, JsonNode step) {
		String at = "step " + sid + ": ";
		switch (type) {
			case "quiz" -> {
				int i = step.path("correctIndex").asInt(-1);
				check(i >= 0 && i < step.path("options").size(), lesson, at + "correctIndex out of range");
			}
			case "match" -> {
				int n = step.path("pairs").size();
				check(n >= 3 && n <= 5, lesson, at + "match needs 3–5 pairs");
			}
			case "sort" -> {
				check(step.path("buckets").size() == 2, lesson, at + "sort needs exactly 2 buckets");
				for (JsonNode item : step.path("items")) {
					int b = item.path("bucket").asInt(-1);
					check(b == 0 || b == 1, lesson, at + "item bucket must be 0 or 1");
				}
			}
			case "slider-chart" -> check(MODELS.contains(step.path("model").asString("")), lesson,
					at + "unknown model '" + step.path("model").asString("") + "'");
			case "scenario" -> {
				check(step.path("choices").size() >= 2, lesson, at + "scenario needs at least 2 choices");
				for (JsonNode c : step.path("choices")) {
					check(c.path("series").size() >= 2, lesson, at + "every choice needs a series");
				}
			}
			case "action" -> check(step.has("body") && step.has("bodyNoData"), lesson,
					at + "action needs body and bodyNoData");
			default -> {
			}
		}
	}

	/** The fields a variant must never change, so every variant keeps the same right answers. */
	private static JsonNode answerFields(JsonNode step) {
		ObjectNode key = JsonNodeFactory.instance.objectNode();
		for (String f : List.of("correctIndex", "answer", "pairs", "model")) {
			key.set(f, step.path(f));
		}
		ArrayNode buckets = key.putArray("buckets");
		step.path("items").forEach(i -> buckets.add(i.path("bucket")));
		ArrayNode series = key.putArray("series");
		step.path("choices").forEach(c -> series.add(c.path("series")));
		return key;
	}

	/** Every concept a lesson uses: {@code concepts} arrays and [[refs]] in any text, variants included. */
	static Set<String> concepts(JsonNode node) {
		Set<String> found = new TreeSet<>();
		collectConcepts(node, found);
		return found;
	}

	private static void collectConcepts(JsonNode node, Set<String> found) {
		if (node.isString()) {
			Matcher m = CONCEPT_REF.matcher(node.asString());
			while (m.find()) {
				found.add(m.group(1));
			}
		}
		else if (node.isObject()) {
			for (var e : node.properties()) {
				if (e.getKey().equals("concepts")) {
					e.getValue().forEach(c -> found.add(c.asString()));
				}
				else {
					collectConcepts(e.getValue(), found);
				}
			}
		}
		else if (node.isArray()) {
			node.forEach(n -> collectConcepts(n, found));
		}
	}

	private static void check(boolean ok, String lesson, String problem) {
		if (!ok) {
			throw new IllegalStateException("Lesson content '" + lesson + "': " + problem);
		}
	}

}
