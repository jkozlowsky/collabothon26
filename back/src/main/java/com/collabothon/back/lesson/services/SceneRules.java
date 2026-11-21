package com.collabothon.back.lesson.services;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Predicate;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Startup validation of a lesson's {@code video} track (.plans/lesson-video-mode-spec.md §4, §6.2). The frontend
 * draws scenes; the backend only makes sure a broken scene can't reach the demo.
 */
final class SceneRules {

	/** Steps that must be in the video order: everything graded or hands-on. Only chat and text may be left out. */
	static final Set<String> REQUIRED_IN_BEATS = Set.of("quiz", "match", "sort", "scenario", "action", "predict",
			"slider-chart");

	/** Amount metrics the device can fill. Mirror of {@code AMOUNTS} in front/src/lib/lessonMetrics.ts. */
	static final Set<String> KNOWN_METRICS = Set.of("savingsBalance", "totalAssets");

	static final Set<String> KINDS = Set.of("character", "phone", "amount", "chart", "tag");

	static final Set<String> POSES = Set.of("sit", "stand", "phone");

	static final Set<String> PLACES = Set.of("office", "home", "street", "cafe");

	static final Set<String> TIMES = Set.of("day", "dusk", "night");

	static final Set<String> CAMERAS = Set.of("push", "pull", "drift", "none");

	static final Set<String> TONES = Set.of("good", "bad", "neutral");

	/** The only fields a {@code byChoice} or {@code noData} override may change. */
	static final Set<String> OVERRIDABLE = Set.of("layers", "captions", "desc", "camera", "duration", "audio");

	static final double MIN_DURATION = 8;

	static final double MAX_DURATION = 15;

	static final double MAX_TOTAL = 60;

	static final double CAPTION_GAP = 2.5;

	static final int CAPTION_MAX = 70;

	private SceneRules() {
	}

	/** Text as read aloud: no **bold**, glossary links as their shown words, lower case, single spaces. */
	static String plain(String text) {
		return text.replace("**", "")
			.replaceAll("\\[\\[[a-z0-9-]+\\|([^\\]]*)]]", "$1")
			.replaceAll("\\[\\[([a-z0-9-]+)]]", "$1")
			.replace('-', ' ')
			.toLowerCase(java.util.Locale.ROOT)
			.replaceAll("\\s+", " ")
			.trim();
	}

	static void validate(String lesson, ObjectNode content, Predicate<String> audioExists) {
		JsonNode video = content.get("video");
		check(video.path("minutes").asInt(0) > 0, lesson, "video.minutes must be positive");

		Map<String, JsonNode> steps = new HashMap<>();
		content.path("steps").forEach(s -> steps.put(s.path("id").asString(""), s));

		Map<String, JsonNode> scenes = new HashMap<>();
		for (JsonNode scene : video.path("scenes")) {
			String sid = scene.path("id").asString("");
			check(!sid.isBlank() && scenes.put(sid, scene) == null, lesson, "missing or duplicate scene id '" + sid + "'");
			check(!steps.containsKey(sid), lesson, "scene id '" + sid + "' clashes with a step id");
			check("scene".equals(scene.path("type").asString("")), lesson, "scene " + sid + " must have type 'scene'");
		}
		check(scenes.size() >= 1 && scenes.size() <= 4, lesson, "a video track needs 1–4 scenes, has " + scenes.size());

		List<String> beats = new ArrayList<>();
		Set<String> seen = new HashSet<>();
		for (JsonNode b : video.path("beats")) {
			String bid = b.asString("");
			check(steps.containsKey(bid) || scenes.containsKey(bid), lesson, "beat '" + bid + "' is no step or scene");
			check(seen.add(bid), lesson, "beat '" + bid + "' appears twice");
			beats.add(bid);
		}
		check(!beats.isEmpty() && scenes.containsKey(beats.getFirst()), lesson, "the first beat must be a scene");
		// Phased lessons: video teaches, so scenes sit in the learn phase. Only a personal scene (one that shows
		// the user's own number) may come later, in "your situation", never after a decision.
		int latest = 0;
		for (String bid : beats) {
			JsonNode step = steps.get(bid);
			if (step != null) {
				latest = Math.max(latest, LessonRules.PHASES.indexOf(step.path("phase").asString("learn")));
			}
			else if (latest > 0) {
				boolean personal = scenes.get(bid).toString().contains("\"metric\"");
				check(personal && latest <= 2, lesson, "scene " + bid
						+ " comes after the learn phase; only a personal scene may, in 'your situation'");
			}
		}
		for (String sid : scenes.keySet()) {
			check(seen.contains(sid), lesson, "scene " + sid + " is not in beats");
		}
		// Video may leave out only the text a scene tells: chat and text steps, and in a phased lesson only in "learn".
		steps.forEach((sid, step) -> check(seen.contains(sid) || "learn".equals(step.path("phase").asString("learn")),
				lesson, "step " + sid + " (" + step.path("phase").asString() + ") must be in beats; video only replaces learn steps"));
		// Every concept of the lesson is linked somewhere the video user sees: a step in beats or a scene's desc.
		StringBuilder seenText = new StringBuilder();
		beats.forEach(b -> seenText.append(steps.containsKey(b) ? steps.get(b) : scenes.get(b).path("desc")));
		content.path("concepts").forEach(c -> check(seenText.toString().contains("[[" + c.asString() + "]]")
				|| seenText.toString().contains("[[" + c.asString() + "|"), lesson,
				"concept '" + c.asString() + "' is never linked in video mode; link it in a scene desc or a step in beats"));
		steps.forEach((sid, step) -> check(seen.contains(sid) || !REQUIRED_IN_BEATS.contains(step.path("type").asString()),
				lesson, "step " + sid + " (" + step.path("type").asString() + ") must be in beats; only chat and text may be left out"));

		double total = 0;
		for (JsonNode scene : video.path("scenes")) {
			String sid = scene.path("id").asString();
			String at = "scene " + sid + ": ";
			check(!scene.path("title").asString("").isBlank(), lesson, at + "missing title");
			check(!scene.path("desc").asString("").isBlank(), lesson, at + "missing desc");
			check(PLACES.contains(scene.path("setting").path("place").asString("")), lesson, at + "unknown setting.place");
			check(TIMES.contains(scene.path("setting").path("time").asString("")), lesson, at + "unknown setting.time");
			// Only the panel text (desc) may link glossary terms; captions and layers are drawn over the video.
			check(!scene.path("captions").toString().contains("[[") && !scene.path("layers").toString().contains("[["), lesson,
					at + "captions and layers hold no [[links]]; link terms in desc");
			validateBody(lesson, at, scene, audioExists);
			total += scene.path("duration").asDouble();

			boolean hasMetric = false;
			for (JsonNode layer : scene.path("layers")) {
				hasMetric |= layer.has("metric");
			}
			check(!hasMetric || scene.has("noData"), lesson, at + "a scene with a metric amount needs noData");
			if (scene.has("noData")) {
				validateOverride(lesson, at + "noData: ", scene, scene.get("noData"), audioExists);
			}

			if (scene.has("byChoice")) {
				JsonNode byChoice = scene.get("byChoice");
				String stepId = byChoice.path("step").asString("");
				JsonNode step = steps.get(stepId);
				check(step != null && "scenario".equals(step.path("type").asString()), lesson,
						at + "byChoice.step must be a scenario step");
				check(beats.indexOf(stepId) >= 0 && beats.indexOf(stepId) < beats.indexOf(sid), lesson,
						at + "byChoice.step must come before the scene in beats");
				int choices = step.path("choices").size();
				for (var e : byChoice.properties()) {
					if (e.getKey().equals("step")) {
						continue;
					}
					int index = parseIndex(e.getKey());
					check(index >= 0 && index < choices, lesson, at + "byChoice key '" + e.getKey() + "' is not a choice index");
					validateOverride(lesson, at + "byChoice " + e.getKey() + ": ", scene, e.getValue(), audioExists);
				}
			}
		}
		check(total <= MAX_TOTAL, lesson, "scenes last " + total + " s in total, at most " + MAX_TOTAL);

		// The transcript (classic mode) says what the narration says: every scene except a choice-dependent ending
		// names the text step it stands for, and that text contains each caption word for word.
		for (JsonNode scene : video.path("scenes")) {
			String sid = scene.path("id").asString();
			if (scene.has("byChoice") && !scene.has("transcript")) {
				continue;
			}
			JsonNode text = steps.get(scene.path("transcript").asString(""));
			check(text != null && "text".equals(text.path("type").asString()) && !seen.contains(text.path("id").asString()),
					lesson, "scene " + sid + " needs a transcript: a text step that is not in beats");
			String body = plain(text.path("kicker").asString("") + " " + text.path("title").asString("") + " "
					+ text.path("body").asString(""));
			for (JsonNode caption : scene.path("captions")) {
				String said = plain(caption.path("text").asString("")).replaceAll("[.!?]+$", "");
				check(body.contains(said), lesson, "scene " + sid + ": transcript " + text.path("id").asString()
						+ " does not say \"" + caption.path("text").asString() + "\"");
			}
		}
	}

	private static void validateOverride(String lesson, String at, JsonNode scene, JsonNode override,
			Predicate<String> audioExists) {
		for (String field : override.propertyNames()) {
			check(OVERRIDABLE.contains(field), lesson, at + "may not override '" + field + "'");
		}
		ObjectNode merged = (ObjectNode) scene.deepCopy();
		override.properties().forEach(e -> merged.set(e.getKey(), e.getValue().deepCopy()));
		check(!merged.path("desc").asString("").isBlank(), lesson, at + "missing desc");
		validateBody(lesson, at, merged, audioExists);
	}

	/** Timing, layers, captions and audio of a scene or of a scene with an override merged in. */
	private static void validateBody(String lesson, String at, JsonNode scene, Predicate<String> audioExists) {
		double duration = scene.path("duration").asDouble(0);
		check(duration >= MIN_DURATION && duration <= MAX_DURATION, lesson,
				at + "duration must be " + MIN_DURATION + "–" + MAX_DURATION + " s");
		check(CAMERAS.contains(scene.path("camera").asString("")), lesson, at + "unknown camera");
		if (scene.has("audio")) {
			String audio = scene.path("audio").asString("");
			check(!audio.contains("..") && audioExists.test(audio), lesson,
					at + "audio file 'static/audio/" + audio + "' does not exist");
		}

		for (JsonNode layer : scene.path("layers")) {
			String kind = layer.path("kind").asString("");
			check(KINDS.contains(kind), lesson, at + "unknown layer kind '" + kind + "'");
			double start = layer.path("at").asDouble(0);
			check(start >= 0 && start + layer.path("len").asDouble(0) <= duration, lesson,
					at + kind + " layer runs past the scene's end");
			switch (kind) {
				case "character" -> {
					check(POSES.contains(layer.path("pose").asString("")), lesson, at + "unknown pose");
					checkUnit(lesson, at, layer, "x");
				}
				case "phone" -> {
					check(layer.path("messages").size() >= 1 && layer.path("messages").size() <= 4, lesson,
							at + "phone needs 1–4 messages");
					for (JsonNode m : layer.path("messages")) {
						check(m.path("text").asString("").length() <= 40, lesson, at + "phone message over 40 chars");
						check(m.path("at").asDouble(-1) >= 0 && m.path("at").asDouble() <= duration, lesson,
								at + "phone message 'at' outside the scene");
					}
				}
				case "amount" -> {
					if (layer.has("metric")) {
						check(KNOWN_METRICS.contains(layer.path("metric").asString("")), lesson,
								at + "unknown metric '" + layer.path("metric").asString("") + "'");
						JsonNode f = layer.path("fallback");
						check(f.path("to").isNumber() && f.has("currency") && f.has("label"), lesson,
								at + "a metric amount needs a fallback with to, currency and label");
					}
					else {
						check(layer.path("to").isNumber() && layer.has("currency"), lesson, at + "amount needs to and currency");
					}
				}
				case "chart" -> {
					int n = layer.path("series").size();
					check(n >= 2 && n <= 8, lesson, at + "chart needs 2–8 points");
					check(layer.has("unit"), lesson, at + "chart needs a unit");
				}
				case "tag" -> {
					check(TONES.contains(layer.path("tone").asString("")), lesson, at + "unknown tone");
					String text = layer.path("text").asString("");
					check(!text.isEmpty() && text.length() <= 10, lesson, at + "tag text must be 1–10 chars");
					checkUnit(lesson, at, layer, "x");
					checkUnit(lesson, at, layer, "y");
				}
				default -> {
				}
			}
		}

		JsonNode captions = scene.path("captions");
		check(captions.size() >= 2 && captions.size() <= 4, lesson, at + "a scene needs 2–4 captions");
		double previous = Double.NEGATIVE_INFINITY;
		for (JsonNode c : captions) {
			double t = c.path("at").asDouble(-1);
			String text = c.path("text").asString("");
			check(t >= 0 && t <= duration, lesson, at + "caption 'at' outside the scene");
			check(t - previous >= CAPTION_GAP, lesson, at + "captions must be sorted and at least " + CAPTION_GAP + " s apart");
			check(!text.isBlank() && text.length() <= CAPTION_MAX, lesson,
					at + "caption must be 1–" + CAPTION_MAX + " chars: '" + text + "'");
			previous = t;
		}
	}

	private static void checkUnit(String lesson, String at, JsonNode layer, String field) {
		double v = layer.path(field).asDouble(-1);
		check(layer.path(field).isNumber() && v >= 0 && v <= 1, lesson, at + field + " must be 0–1");
	}

	private static int parseIndex(String key) {
		try {
			return Integer.parseInt(key);
		}
		catch (NumberFormatException e) {
			return -1;
		}
	}

	private static void check(boolean ok, String lesson, String problem) {
		if (!ok) {
			throw new IllegalStateException("Lesson content '" + lesson + "': " + problem);
		}
	}

}
