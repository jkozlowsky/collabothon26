package com.collabothon.back.lesson.models;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;

import com.collabothon.back.lesson.consts.LessonConsts;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class LessonJson {

	// Objects merge deeply, arrays and values are replaced.
	public static ObjectNode applyVariants(ObjectNode lesson, Collection<String> keys) {
		ObjectNode result = lesson.deepCopy();
		JsonNode variants = result.remove("variants");
		if (variants == null) {
			return result;
		}
		for (String prefix : LessonConsts.VARIANT_ORDER) {
			keys.stream()
				.filter(key -> key.startsWith(prefix) && variants.has(key))
				.forEach(key -> mergeSteps(result, variants.get(key)));
		}
		return result;
	}

	private static void mergeSteps(ObjectNode lesson, JsonNode overrides) {
		for (Map.Entry<String, JsonNode> override : overrides.properties()) {
			merge(findStep(lesson, override.getKey()).orElseThrow(), override.getValue());
		}
	}

	public static void merge(ObjectNode target, JsonNode patch) {
		for (Map.Entry<String, JsonNode> field : patch.properties()) {
			if (target.get(field.getKey()) instanceof ObjectNode current && field.getValue().isObject()) {
				merge(current, field.getValue());
			}
			else {
				target.set(field.getKey(), field.getValue().deepCopy());
			}
		}
	}

	public static Optional<ObjectNode> findStep(JsonNode lesson, String stepId) {
		return lesson.path("steps")
			.valueStream()
			.filter(step -> stepId.equals(step.path("id").asString("")))
			.findFirst()
			.map(ObjectNode.class::cast);
	}

	// Every concept in use: concepts arrays and [[refs]] in any text, variants included.
	public static Set<String> concepts(JsonNode node) {
		Set<String> found = new TreeSet<>();
		collectConcepts(node, found);
		return found;
	}

	private static void collectConcepts(JsonNode node, Set<String> found) {
		if (node.isString()) {
			LessonConsts.CONCEPT_REF.matcher(node.asString()).results().forEach(match -> found.add(match.group(1)));
		}
		else if (node.isObject()) {
			node.properties().forEach(field -> collectFromField(field.getKey(), field.getValue(), found));
		}
		else if (node.isArray()) {
			node.forEach(item -> collectConcepts(item, found));
		}
	}

	private static void collectFromField(String name, JsonNode value, Set<String> found) {
		if ("concepts".equals(name)) {
			value.forEach(concept -> found.add(concept.asString()));
			return;
		}
		collectConcepts(value, found);
	}

}
