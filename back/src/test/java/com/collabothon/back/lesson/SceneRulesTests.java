package com.collabothon.back.lesson;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Set;
import java.util.function.Consumer;
import java.util.function.Predicate;

import org.junit.jupiter.api.Test;

import com.collabothon.back.lesson.validation.LessonRules;

import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/** One broken lesson per video-track rule (lesson-video-mode-spec §6.2); each must fail with a clear message. */
class SceneRulesTests {

	private final JsonMapper json = JsonMapper.builder().build();

	private static final Set<String> GLOSSARY = Set.of("leverage");

	private static final Predicate<String> NO_AUDIO = audio -> false;

	private static final String SCENE = """
			{ "type": "scene", "id": "%s", "title": "T", "desc": "D", "duration": 10, "camera": "push", "transcript": "t1",
			  "setting": { "place": "office", "time": "night" },
			  "layers": [ { "kind": "character", "pose": "sit", "x": 0.3 },
			              { "kind": "tag", "at": 1, "text": "+40%%", "tone": "good", "x": 0.5, "y": 0.5 } ],
			  "captions": [ { "at": 0.5, "text": "One." }, { "at": 4, "text": "Two." } ] }""";

	private ObjectNode lesson() {
		return (ObjectNode) json.readTree("""
				{ "id": "x-1", "xp": 10,
				  "steps": [
				    { "type": "text", "id": "t1", "body": "One. **Two.**" },
				    { "type": "scenario", "id": "sc1", "prompt": "p", "unit": "₩M", "periodLabel": "6 months",
				      "choices": [ { "label": "a", "series": [1, 2], "ending": "x" }, { "label": "b", "series": [1, 1], "ending": "y" } ] },
				    { "type": "quiz", "id": "q1", "prompt": "p", "options": ["a", "b"], "correctIndex": 0, "explanation": "e" }
				  ],
				  "video": { "minutes": 4, "scenes": [ %s, %s, %s ], "beats": ["v1", "sc1", "v2", "q1", "v3"] } }"""
			.formatted(SCENE.formatted("v1"), SCENE.formatted("v2"), SCENE.formatted("v3")));
	}

	private ObjectNode scene(ObjectNode lesson, int i) {
		return (ObjectNode) lesson.at("/video/scenes/" + i);
	}

	private void fails(Consumer<ObjectNode> breakIt, String message) {
		ObjectNode l = lesson();
		breakIt.accept(l);
		assertThatThrownBy(() -> LessonRules.validate(l, GLOSSARY, NO_AUDIO)).hasMessageContaining("x-1").hasMessageContaining(message);
	}

	private ArrayNode beats(ObjectNode l) {
		return (ArrayNode) l.at("/video/beats");
	}

	@Test
	void aValidTrackPasses() {
		assertThatCode(() -> LessonRules.validate(lesson(), GLOSSARY, NO_AUDIO)).doesNotThrowAnyException();
	}

	@Test
	void idsAndBeats() {
		fails(l -> scene(l, 1).put("id", "v1"), "duplicate scene id 'v1'");
		fails(l -> scene(l, 1).put("id", "q1"), "clashes with a step id");
		fails(l -> beats(l).add("nope"), "beat 'nope' is no step or scene");
		fails(l -> beats(l).insert(1, "v2"), "beat 'v2' appears twice");
		fails(l -> {
			beats(l).remove(0);
			beats(l).add("v1");
		}, "the first beat must be a scene");
		fails(l -> {
			ArrayNode scenes = (ArrayNode) l.at("/video/scenes");
			scenes.add(json.readTree(SCENE.formatted("v4"))).add(json.readTree(SCENE.formatted("v5")));
		}, "1–4 scenes");
		fails(l -> beats(l).remove(3), "step q1 (quiz) must be in beats");
	}

	@Test
	void phasedLessonsKeepVideoInTheLearnPhase() {
		Consumer<ObjectNode> phased = l -> {
			((ObjectNode) l.at("/steps/0")).put("phase", "learn");
			((ObjectNode) l.at("/steps/1")).put("phase", "challenge");
			((ObjectNode) l.at("/steps/2")).put("phase", "you");
		};
		// v2 sits after the challenge step sc1.
		fails(phased, "scene v2 comes after the learn phase");
		ObjectNode ok = lesson();
		phased.accept(ok);
		beats(ok).removeAll().add("v1").add("v2").add("v3").add("sc1").add("q1");
		assertThatCode(() -> LessonRules.validate(ok, GLOSSARY, NO_AUDIO)).doesNotThrowAnyException();
	}

	@Test
	void everyConceptIsLinkedInVideoMode() {
		fails(l -> l.putArray("concepts").add("leverage"), "concept 'leverage' is never linked in video mode");
		ObjectNode ok = lesson();
		ok.putArray("concepts").add("leverage");
		scene(ok, 0).put("desc", "Borrowing to invest is called [[leverage]].");
		assertThatCode(() -> LessonRules.validate(ok, GLOSSARY, NO_AUDIO)).doesNotThrowAnyException();
		fails(l -> scene(l, 0).putArray("captions").addObject().put("at", 1).put("text", "[[leverage]]"), "captions and layers hold no [[links]]");
	}

	@Test
	void transcriptSaysWhatTheNarrationSays() {
		fails(l -> scene(l, 0).remove("transcript"), "scene v1 needs a transcript");
		fails(l -> scene(l, 0).put("transcript", "q1"), "scene v1 needs a transcript");
		fails(l -> ((ObjectNode) l.at("/steps/0")).put("body", "One."), "transcript t1 does not say \"Two.\"");
	}

	@Test
	void timing() {
		fails(l -> scene(l, 0).put("duration", 7), "duration must be");
		fails(l -> scene(l, 0).put("duration", 16), "duration must be");
		fails(l -> ((ObjectNode) l.at("/video/scenes/0/layers/1")).put("len", 20), "runs past the scene's end");
		fails(l -> ((ObjectNode) l.at("/video/scenes/0/captions/1")).put("at", 2), "at least 2.5 s apart");
		fails(l -> ((ObjectNode) l.at("/video/scenes/0/captions/1")).put("text", "x".repeat(71)), "1–70 chars");
	}

	@Test
	void fourLongestScenesFitTheCap() {
		ObjectNode l = lesson();
		((ArrayNode) l.at("/video/scenes")).add(json.readTree(SCENE.formatted("v4")));
		beats(l).add("v4");
		for (int i = 0; i < 4; i++) {
			scene(l, i).put("duration", 15);
		}
		assertThatCode(() -> LessonRules.validate(l, GLOSSARY, NO_AUDIO)).doesNotThrowAnyException();
		scene(l, 3).put("duration", 15.5);
		assertThatThrownBy(() -> LessonRules.validate(l, GLOSSARY, NO_AUDIO)).hasMessageContaining("duration must be");
		// 4 scenes × 15 s is exactly the 60 s cap; more needs a fifth scene or a longer one, both rejected above.
	}

	@Test
	void knownValues() {
		fails(l -> ((ObjectNode) l.at("/video/scenes/0/layers/0")).put("kind", "dragon"), "unknown layer kind 'dragon'");
		fails(l -> ((ObjectNode) l.at("/video/scenes/0/layers/0")).put("pose", "dance"), "unknown pose");
		fails(l -> ((ObjectNode) l.at("/video/scenes/0/setting")).put("place", "moon"), "unknown setting.place");
		fails(l -> ((ObjectNode) l.at("/video/scenes/0/setting")).put("time", "noon"), "unknown setting.time");
		fails(l -> scene(l, 0).put("camera", "zoom"), "unknown camera");
		fails(l -> ((ObjectNode) l.at("/video/scenes/0/layers/1")).put("tone", "great"), "unknown tone");
		fails(l -> ((ObjectNode) l.at("/video/scenes/0/captions/0")).put("text", "See [[leverage]]"), "no [[links]]");
	}

	@Test
	void byChoice() {
		fails(l -> scene(l, 1).set("byChoice", json.readTree("{ \"step\": \"q1\" }")), "byChoice.step must be a scenario");
		fails(l -> scene(l, 0).set("byChoice", json.readTree("{ \"step\": \"sc1\" }")), "must come before the scene");
		fails(l -> scene(l, 1).set("byChoice", json.readTree("{ \"step\": \"sc1\", \"2\": { \"desc\": \"x\" } }")),
				"not a choice index");
		fails(l -> scene(l, 1).set("byChoice", json.readTree("{ \"step\": \"sc1\", \"0\": { \"title\": \"x\" } }")),
				"may not override 'title'");
		fails(l -> scene(l, 1).set("byChoice", json.readTree("{ \"step\": \"sc1\", \"0\": { \"duration\": 20 } }")),
				"duration must be");
		ObjectNode ok = lesson();
		scene(ok, 1).set("byChoice", json.readTree("{ \"step\": \"sc1\", \"0\": { \"desc\": \"x\" }, \"1\": { \"camera\": \"none\" } }"));
		assertThatCode(() -> LessonRules.validate(ok, GLOSSARY, NO_AUDIO)).doesNotThrowAnyException();
	}

	@Test
	void personalAmount() {
		String amount = "{ \"kind\": \"amount\", \"at\": 0.5, \"len\": 2, \"metric\": \"%s\", \"label\": \"Yours\"%s }";
		String fallback = ", \"fallback\": { \"to\": 10, \"currency\": \"KRW\", \"label\": \"Hers\" }";
		String noData = "{ \"captions\": [ { \"at\": 0.5, \"text\": \"Hers.\" }, { \"at\": 4, \"text\": \"Two.\" } ] }";
		fails(l -> ((ArrayNode) scene(l, 2).get("layers")).add(json.readTree(amount.formatted("shoeSize", fallback))),
				"unknown metric 'shoeSize'");
		fails(l -> {
			((ArrayNode) scene(l, 2).get("layers")).add(json.readTree(amount.formatted("savingsBalance", "")));
			scene(l, 2).set("noData", json.readTree(noData));
		}, "needs a fallback");
		fails(l -> ((ArrayNode) scene(l, 2).get("layers")).add(json.readTree(amount.formatted("savingsBalance", fallback))),
				"needs noData");
		ObjectNode ok = lesson();
		((ArrayNode) scene(ok, 2).get("layers")).add(json.readTree(amount.formatted("savingsBalance", fallback)));
		scene(ok, 2).set("noData", json.readTree(noData));
		assertThatCode(() -> LessonRules.validate(ok, GLOSSARY, NO_AUDIO)).doesNotThrowAnyException();
	}

	@Test
	void audioFilesMustExist() {
		ObjectNode l = lesson();
		scene(l, 0).put("audio", "x-1/v1.mp3");
		assertThatThrownBy(() -> LessonRules.validate(l, GLOSSARY, audio -> false))
			.hasMessageContaining("audio file 'static/audio/x-1/v1.mp3' does not exist");
		assertThatCode(() -> LessonRules.validate(l, GLOSSARY, "x-1/v1.mp3"::equals)).doesNotThrowAnyException();
		scene(l, 0).put("audio", "../secret.mp3");
		assertThatThrownBy(() -> LessonRules.validate(l, GLOSSARY, audio -> true)).hasMessageContaining("does not exist");
	}

}
