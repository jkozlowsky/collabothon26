package com.collabothon.back.lesson.validation;

import java.util.function.Predicate;

import com.collabothon.back.lesson.consts.SceneConsts;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
final class SceneContentRules {

	static void validate(ContentCheck check, JsonNode scene, Predicate<String> audioExists) {
		check.require(!scene.path("title").asString("").isBlank(), "missing title");
		checkDescription(check, scene);
		JsonNode setting = scene.path("setting");
		check.require(SceneConsts.PLACES.contains(setting.path("place").asString("")), "unknown setting.place");
		check.require(SceneConsts.TIMES.contains(setting.path("time").asString("")), "unknown setting.time");
		// Only desc may link glossary terms; captions and layers are drawn over the video.
		check.require(!scene.path("captions").toString().contains(SceneConsts.LINK_START)
				&& !scene.path("layers").toString().contains(SceneConsts.LINK_START),
				"captions and layers hold no [[links]]; link terms in desc");
		checkPlayback(check, scene, audioExists);
	}

	static void validateOverride(ContentCheck check, JsonNode scene, JsonNode override, Predicate<String> audioExists) {
		for (String field : override.propertyNames()) {
			check.require(SceneConsts.OVERRIDABLE.contains(field), "may not override '" + field + "'");
		}
		ObjectNode merged = (ObjectNode) scene.deepCopy();
		override.properties().forEach(field -> merged.set(field.getKey(), field.getValue().deepCopy()));
		checkDescription(check, merged);
		checkPlayback(check, merged, audioExists);
	}

	private static void checkDescription(ContentCheck check, JsonNode scene) {
		check.require(!scene.path("desc").asString("").isBlank(), "missing desc");
	}

	private static void checkPlayback(ContentCheck check, JsonNode scene, Predicate<String> audioExists) {
		double duration = scene.path("duration").asDouble(0);
		check.require(duration >= SceneConsts.MIN_DURATION && duration <= SceneConsts.MAX_DURATION,
				"duration must be " + SceneConsts.MIN_DURATION + "–" + SceneConsts.MAX_DURATION + " s");
		check.require(SceneConsts.CAMERAS.contains(scene.path("camera").asString("")), "unknown camera");
		if (scene.has("audio")) {
			checkAudio(check, scene.path("audio").asString(""), audioExists);
		}
		for (JsonNode layer : scene.path("layers")) {
			checkLayer(check, layer, duration);
		}
		checkCaptions(check, scene.path("captions"), duration);
	}

	private static void checkAudio(ContentCheck check, String audio, Predicate<String> audioExists) {
		check.require(!audio.contains(SceneConsts.PARENT_DIRECTORY) && audioExists.test(audio),
				"audio file 'static/audio/" + audio + "' does not exist");
	}

	private static void checkLayer(ContentCheck check, JsonNode layer, double duration) {
		String kind = layer.path("kind").asString("");
		check.require(SceneConsts.KINDS.contains(kind), "unknown layer kind '" + kind + "'");
		double start = layer.path("at").asDouble(0);
		check.require(start >= 0 && start + layer.path("len").asDouble(0) <= duration,
				kind + " layer runs past the scene's end");
		switch (kind) {
			case SceneConsts.CHARACTER -> checkCharacter(check, layer);
			case SceneConsts.PHONE -> checkPhone(check, layer.path("messages"), duration);
			case SceneConsts.AMOUNT -> checkAmount(check, layer);
			case SceneConsts.CHART -> checkChart(check, layer);
			case SceneConsts.TAG -> checkTag(check, layer);
		}
	}

	private static void checkCharacter(ContentCheck check, JsonNode layer) {
		check.require(SceneConsts.POSES.contains(layer.path("pose").asString("")), "unknown pose");
		checkUnit(check, layer, "x");
	}

	private static void checkPhone(ContentCheck check, JsonNode messages, double duration) {
		check.require(messages.size() >= SceneConsts.MIN_MESSAGES && messages.size() <= SceneConsts.MAX_MESSAGES,
				"phone needs 1–4 messages");
		for (JsonNode message : messages) {
			check.require(message.path("text").asString("").length() <= SceneConsts.MESSAGE_MAX_LENGTH,
					"phone message over 40 chars");
			check.require(message.path("at").asDouble(-1) >= 0 && message.path("at").asDouble() <= duration,
					"phone message 'at' outside the scene");
		}
	}

	private static void checkAmount(ContentCheck check, JsonNode layer) {
		if (!layer.has("metric")) {
			check.require(layer.path("to").isNumber() && layer.has("currency"), "amount needs to and currency");
			return;
		}
		String metric = layer.path("metric").asString("");
		check.require(SceneConsts.KNOWN_METRICS.contains(metric), "unknown metric '" + metric + "'");
		JsonNode fallback = layer.path("fallback");
		check.require(fallback.path("to").isNumber() && fallback.has("currency") && fallback.has("label"),
				"a metric amount needs a fallback with to, currency and label");
	}

	private static void checkChart(ContentCheck check, JsonNode layer) {
		int points = layer.path("series").size();
		check.require(points >= SceneConsts.CHART_MIN_POINTS && points <= SceneConsts.CHART_MAX_POINTS,
				"chart needs 2–8 points");
		check.require(layer.has("unit"), "chart needs a unit");
	}

	private static void checkTag(ContentCheck check, JsonNode layer) {
		check.require(SceneConsts.TONES.contains(layer.path("tone").asString("")), "unknown tone");
		String text = layer.path("text").asString("");
		check.require(!text.isEmpty() && text.length() <= SceneConsts.TAG_MAX_LENGTH, "tag text must be 1–10 chars");
		checkUnit(check, layer, "x");
		checkUnit(check, layer, "y");
	}

	private static void checkUnit(ContentCheck check, JsonNode layer, String field) {
		double value = layer.path(field).asDouble(-1);
		check.require(layer.path(field).isNumber() && value >= 0 && value <= 1, field + " must be 0–1");
	}

	private static void checkCaptions(ContentCheck check, JsonNode captions, double duration) {
		check.require(captions.size() >= SceneConsts.MIN_CAPTIONS && captions.size() <= SceneConsts.MAX_CAPTIONS,
				"a scene needs 2–4 captions");
		double previous = Double.NEGATIVE_INFINITY;
		for (JsonNode caption : captions) {
			double at = caption.path("at").asDouble(-1);
			String text = caption.path("text").asString("");
			check.require(at >= 0 && at <= duration, "caption 'at' outside the scene");
			check.require(at - previous >= SceneConsts.CAPTION_GAP,
					"captions must be sorted and at least " + SceneConsts.CAPTION_GAP + " s apart");
			check.require(!text.isBlank() && text.length() <= SceneConsts.CAPTION_MAX_LENGTH,
					"caption must be 1–" + SceneConsts.CAPTION_MAX_LENGTH + " chars: '" + text + "'");
			previous = at;
		}
	}

}
