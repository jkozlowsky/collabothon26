package com.collabothon.back.lesson.validation;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Predicate;
import java.util.stream.Collectors;

import com.collabothon.back.lesson.consts.LessonConsts;
import com.collabothon.back.lesson.consts.SceneConsts;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import tools.jackson.databind.JsonNode;

// The video track (.plans/lesson-video-mode-spec.md §6.2): a broken scene must stop startup, not the demo.
@NoArgsConstructor(access = AccessLevel.PRIVATE)
final class SceneRules {

	static void validate(ContentCheck check, JsonNode lesson, Predicate<String> audioExists) {
		JsonNode video = lesson.get("video");
		check.require(video.path("minutes").asInt(0) > 0, "video.minutes must be positive");

		Map<String, JsonNode> steps = stepsById(lesson);
		Map<String, JsonNode> scenes = scenesById(check, video.path("scenes"), steps);
		List<String> beats = beats(check, video.path("beats"), steps, scenes);
		VideoTrack track = new VideoTrack(steps, scenes, video.path("scenes"), beats);

		checkScenesTeachFirst(check, track);
		checkEverySceneInBeats(check, track);
		checkOnlyLearnStepsLeftOut(check, track);
		checkConceptsLinked(check, track, lesson.path("concepts"));
		checkRequiredStepsInBeats(check, track);
		checkScenes(check, track, audioExists);
		checkTranscripts(check, track);
	}

	private static Map<String, JsonNode> stepsById(JsonNode lesson) {
		Map<String, JsonNode> steps = new HashMap<>();
		lesson.path("steps").forEach(step -> steps.put(step.path("id").asString(""), step));
		return steps;
	}

	private static Map<String, JsonNode> scenesById(ContentCheck check, JsonNode sceneList, Map<String, JsonNode> steps) {
		Map<String, JsonNode> scenes = new HashMap<>();
		for (JsonNode scene : sceneList) {
			String id = scene.path("id").asString("");
			check.require(!id.isBlank() && !scenes.containsKey(id), "missing or duplicate scene id '" + id + "'");
			scenes.put(id, scene);
			check.require(!steps.containsKey(id), "scene id '" + id + "' clashes with a step id");
			check.require(SceneConsts.SCENE.equals(scene.path("type").asString("")),
					"scene " + id + " must have type 'scene'");
		}
		check.require(scenes.size() >= SceneConsts.MIN_SCENES && scenes.size() <= SceneConsts.MAX_SCENES,
				"a video track needs 1–4 scenes, has " + scenes.size());
		return scenes;
	}

	private static List<String> beats(ContentCheck check, JsonNode beatList, Map<String, JsonNode> steps,
			Map<String, JsonNode> scenes) {
		List<String> beats = new ArrayList<>();
		for (JsonNode beat : beatList) {
			String id = beat.asString("");
			check.require(steps.containsKey(id) || scenes.containsKey(id), "beat '" + id + "' is no step or scene");
			check.require(!beats.contains(id), "beat '" + id + "' appears twice");
			beats.add(id);
		}
		check.require(!beats.isEmpty() && scenes.containsKey(beats.getFirst()), "the first beat must be a scene");
		return beats;
	}

	// Scenes teach, so they sit in "learn"; only one showing the user's own number may come later, up to "you".
	private static void checkScenesTeachFirst(ContentCheck check, VideoTrack track) {
		int learnRank = LessonConsts.PHASES.indexOf(LessonConsts.LEARN);
		int youRank = LessonConsts.PHASES.indexOf(LessonConsts.YOU);
		int latest = learnRank;
		for (String id : track.beats()) {
			JsonNode step = track.stepsById().get(id);
			if (step != null) {
				latest = Math.max(latest, LessonConsts.PHASES.indexOf(phaseOf(step)));
			}
			else if (latest > learnRank) {
				boolean personal = track.scenesById().get(id).toString().contains(SceneConsts.METRIC_PROPERTY);
				check.require(personal && latest <= youRank, "scene " + id
						+ " comes after the learn phase; only a personal scene may, in 'your situation'");
			}
		}
	}

	private static void checkEverySceneInBeats(ContentCheck check, VideoTrack track) {
		for (String id : track.scenesById().keySet()) {
			check.require(track.beats().contains(id), "scene " + id + " is not in beats");
		}
	}

	private static void checkOnlyLearnStepsLeftOut(ContentCheck check, VideoTrack track) {
		track.stepsById().forEach((id, step) -> check.require(
				track.beats().contains(id) || LessonConsts.LEARN.equals(phaseOf(step)),
				"step " + id + " (" + step.path("phase").asString() + ") must be in beats; video only replaces learn steps"));
	}

	private static void checkConceptsLinked(ContentCheck check, VideoTrack track, JsonNode concepts) {
		String shown = track.beats().stream().map(id -> shownText(track, id)).collect(Collectors.joining());
		for (JsonNode concept : concepts) {
			String link = SceneConsts.LINK_START + concept.asString();
			check.require(shown.contains(link + SceneConsts.LINK_END) || shown.contains(link + SceneConsts.LINK_LABEL),
					"concept '" + concept.asString()
							+ "' is never linked in video mode; link it in a scene desc or a step in beats");
		}
	}

	// What the video user reads at a beat: the whole step, or a scene's desc.
	private static String shownText(VideoTrack track, String id) {
		if (track.stepsById().containsKey(id)) {
			return track.stepsById().get(id).toString();
		}
		return track.scenesById().get(id).path("desc").toString();
	}

	private static void checkRequiredStepsInBeats(ContentCheck check, VideoTrack track) {
		track.stepsById().forEach((id, step) -> check.require(
				track.beats().contains(id) || !SceneConsts.REQUIRED_IN_BEATS.contains(step.path("type").asString()),
				"step " + id + " (" + step.path("type").asString() + ") must be in beats; only chat and text may be left out"));
	}

	private static void checkScenes(ContentCheck check, VideoTrack track, Predicate<String> audioExists) {
		double total = 0;
		for (JsonNode scene : track.scenes()) {
			ContentCheck sceneCheck = check.within("scene " + scene.path("id").asString() + ": ");
			SceneContentRules.validate(sceneCheck, scene, audioExists);
			total += scene.path("duration").asDouble();
			checkNoData(sceneCheck, scene, audioExists);
			if (scene.has("byChoice")) {
				checkByChoice(sceneCheck, track, scene, audioExists);
			}
		}
		check.require(total <= SceneConsts.MAX_TOTAL,
				"scenes last " + total + " s in total, at most " + SceneConsts.MAX_TOTAL);
	}

	private static void checkNoData(ContentCheck check, JsonNode scene, Predicate<String> audioExists) {
		boolean hasMetric = scene.path("layers").valueStream().anyMatch(layer -> layer.has("metric"));
		check.require(!hasMetric || scene.has("noData"), "a scene with a metric amount needs noData");
		if (scene.has("noData")) {
			SceneContentRules.validateOverride(check.within("noData: "), scene, scene.get("noData"), audioExists);
		}
	}

	private static void checkByChoice(ContentCheck check, VideoTrack track, JsonNode scene,
			Predicate<String> audioExists) {
		JsonNode byChoice = scene.get("byChoice");
		String stepId = byChoice.path("step").asString("");
		JsonNode step = track.stepsById().get(stepId);
		check.require(step != null && LessonConsts.SCENARIO.equals(step.path("type").asString()),
				"byChoice.step must be a scenario step");
		int stepBeat = track.beats().indexOf(stepId);
		check.require(stepBeat >= 0 && stepBeat < track.beats().indexOf(scene.path("id").asString()),
				"byChoice.step must come before the scene in beats");
		int choices = step.path("choices").size();
		for (Map.Entry<String, JsonNode> choice : byChoice.properties()) {
			String key = choice.getKey();
			if ("step".equals(key)) {
				continue;
			}
			check.require(isIndex(key, choices), "byChoice key '" + key + "' is not a choice index");
			SceneContentRules.validateOverride(check.within("byChoice " + key + ": "), scene, choice.getValue(),
					audioExists);
		}
	}

	private static boolean isIndex(String key, int size) {
		try {
			int index = Integer.parseInt(key);
			return index >= 0 && index < size;
		}
		catch (NumberFormatException e) {
			return false;
		}
	}

	// Classic mode says what the narration says: the transcript step holds every caption word for word.
	private static void checkTranscripts(ContentCheck check, VideoTrack track) {
		for (JsonNode scene : track.scenes()) {
			// An ending that depends on a choice needs no transcript.
			if (scene.has("byChoice") && !scene.has("transcript")) {
				continue;
			}
			checkTranscript(check, track, scene);
		}
	}

	private static void checkTranscript(ContentCheck check, VideoTrack track, JsonNode scene) {
		String id = scene.path("id").asString();
		JsonNode text = track.stepsById().get(scene.path("transcript").asString(""));
		check.require(text != null && LessonConsts.TEXT.equals(text.path("type").asString())
				&& !track.beats().contains(text.path("id").asString()),
				"scene " + id + " needs a transcript: a text step that is not in beats");
		String body = plain(text.path("kicker").asString("") + " " + text.path("title").asString("") + " "
				+ text.path("body").asString(""));
		for (JsonNode caption : scene.path("captions")) {
			String spoken = plain(caption.path("text").asString(""));
			String said = SceneConsts.FINAL_PUNCTUATION.matcher(spoken).replaceAll("");
			check.require(body.contains(said), "scene " + id + ": transcript " + text.path("id").asString()
					+ " does not say \"" + caption.path("text").asString() + "\"");
		}
	}

	// As read aloud: no bold, links as their shown words, lower case, single spaces.
	private static String plain(String text) {
		String labelsShown = SceneConsts.LABELLED_LINK.matcher(text.replace(SceneConsts.BOLD, "")).replaceAll("$1");
		String linksShown = SceneConsts.PLAIN_LINK.matcher(labelsShown).replaceAll("$1");
		String words = linksShown.replace('-', ' ').toLowerCase(Locale.ROOT);
		return LessonConsts.WHITESPACE.matcher(words).replaceAll(" ").trim();
	}

	private static String phaseOf(JsonNode step) {
		return step.path("phase").asString(LessonConsts.LEARN);
	}

}
