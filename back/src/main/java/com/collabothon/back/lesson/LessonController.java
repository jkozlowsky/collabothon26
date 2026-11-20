package com.collabothon.back.lesson;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Stories and lessons from {@link LessonContent}, assembled per user: variants picked from the profile
 * (level, persona) and the {@code lang} parameter. The user id comes from the host banking app (prototype: a
 * query parameter, not authenticated). Without a user id lessons come unpersonalised and unlocked.
 */
@RestController
@RequestMapping("/api")
class LessonController {

	private final LessonContent content;

	private final LessonProgress progress;

	LessonController(LessonContent content, LessonProgress progress) {
		this.content = content;
		this.progress = progress;
	}

	/** Stories for the globe, with the user's progress through each. */
	@GetMapping("/stories")
	List<ObjectNode> stories(@RequestParam(required = false) String userId) {
		Set<String> done = progress.completed(userId);
		List<ObjectNode> out = new ArrayList<>();
		boolean currentTaken = false;
		for (JsonNode story : content.stories()) {
			ObjectNode s = (ObjectNode) story.deepCopy();
			s.remove("lessonIds");
			List<LessonSummary> lessons = summaries(story, done);
			long completed = lessons.stream().filter(l -> l.status().equals("done")).count();
			s.putPOJO("lessons", lessons);
			s.putObject("progress").put("done", completed).put("total", lessons.size());
			LessonSummary next = lessons.stream().filter(l -> !l.status().equals("done")).findFirst().orElse(null);
			s.putPOJO("nextLesson", next);
			boolean current = !currentTaken && next != null && "available".equals(story.path("status").asString());
			currentTaken |= current;
			s.put("current", current);
			out.add(s);
		}
		return out;
	}

	/** Every lesson in story order, with the user's status. The Map lists these until the globe lands. */
	@GetMapping("/lessons")
	List<LessonSummary> list(@RequestParam(required = false) String userId) {
		Set<String> done = progress.completed(userId);
		return content.stories().stream().flatMap(s -> summaries(s, done).stream()).toList();
	}

	/** One lesson, ready to play: variants merged, plus the glossary entries it links to. */
	@GetMapping("/lessons/{id}")
	ObjectNode get(@PathVariable String id, @RequestParam(defaultValue = "standard") String lang,
			@RequestParam(required = false) String userId) {
		if (!lang.equals("standard") && !lang.equals("plain")) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "lang must be standard or plain");
		}
		ObjectNode base = lessonOr404(id);
		requireUnlocked(base, userId);

		List<String> keys = new ArrayList<>();
		progress.variantProfile(userId).ifPresent(p -> {
			// Onboarding answers (UserProfileController.OnboardingRequest) mapped onto content variants.
			if (p.experience() != null) {
				switch (p.experience()) {
					case "not-saving", "occasional" -> keys.add("level:beginner");
					case "investing", "planning" -> keys.add("level:advanced");
					default -> {
					}
				}
			}
			if (p.lifeStage() != null) {
				switch (p.lifeStage()) {
					case "starting-out" -> keys.add("persona:student");
					case "building" -> keys.add("persona:family");
					case "later-life" -> keys.add("persona:pre-retirement");
					default -> {
					}
				}
			}
		});
		if (lang.equals("plain")) {
			keys.add("lang:plain");
		}

		ObjectNode lesson = LessonRules.applyVariants(base, keys);
		List<String> ids = storyLessonIds(lesson);
		int index = ids.indexOf(id);
		lesson.put("lang", lang);
		lesson.put("position", index + 1);
		lesson.put("total", ids.size());
		lesson.put("next", index + 1 < ids.size() ? ids.get(index + 1) : null);
		ObjectNode glossary = lesson.putObject("glossary");
		LessonRules.concepts(lesson).forEach(c -> glossary.set(c, content.glossary().get(c)));
		return lesson;
	}

	/** Saves a finished lesson: completion (XP once), knowledge per concept, scenario choices. */
	@PostMapping("/lessons/{id}/result")
	@Transactional
	ResultResponse result(@PathVariable String id, @RequestParam String userId,
			@Valid @RequestBody ResultRequest req) {
		if (userId.isBlank() || userId.length() > 64) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid user id");
		}
		ObjectNode lesson = lessonOr404(id);
		requireUnlocked(lesson, userId);

		for (StepResult r : req.steps()) {
			JsonNode step = stepOr400(lesson, r.stepId());
			if (!LessonRules.GRADED.contains(step.path("type").asString())) {
				continue;
			}
			JsonNode concepts = step.has("concepts") ? step.get("concepts") : lesson.path("concepts");
			concepts.forEach(c -> progress.recordConcept(userId, c.asString(), r.correctFirstTry()));
		}
		if (req.scenarioChoices() != null) {
			req.scenarioChoices().forEach((stepId, choice) -> {
				JsonNode step = stepOr400(lesson, stepId);
				if (!"scenario".equals(step.path("type").asString()) || choice == null || choice < 0
						|| choice >= step.path("choices").size()) {
					throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid scenario choice " + stepId);
				}
				progress.recordScenarioChoice(userId, id, stepId, choice);
			});
		}

		int xp = lesson.path("xp").asInt();
		boolean first = progress.complete(userId, id, xp);
		progress.recordActivity(userId, req.completedOn() == null ? LocalDate.now(ZoneOffset.UTC) : req.completedOn());
		return new ResultResponse(first ? xp : 0, first, progress.totalXp(userId), next(lesson));
	}

	private ObjectNode lessonOr404(String id) {
		return content.lesson(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
	}

	private static JsonNode stepOr400(JsonNode lesson, String stepId) {
		try {
			return LessonRules.step(lesson, stepId);
		}
		catch (IllegalArgumentException e) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
		}
	}

	private List<String> storyLessonIds(JsonNode lesson) {
		return content.lessonIdsOf(content.story(lesson.path("story").asString()));
	}

	private String next(JsonNode lesson) {
		List<String> ids = storyLessonIds(lesson);
		int index = ids.indexOf(lesson.path("id").asString());
		return index + 1 < ids.size() ? ids.get(index + 1) : null;
	}

	/** Lessons in a story open one after another; all stories are open. */
	private void requireUnlocked(JsonNode lesson, String userId) {
		if (userId == null) {
			return;
		}
		List<String> ids = storyLessonIds(lesson);
		int index = ids.indexOf(lesson.path("id").asString());
		if (index > 0 && !progress.completed(userId).contains(ids.get(index - 1))) {
			throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Finish the previous lesson in this story first");
		}
	}

	private List<LessonSummary> summaries(JsonNode story, Set<String> done) {
		List<LessonSummary> out = new ArrayList<>();
		boolean previousDone = true;
		for (String lessonId : content.lessonIdsOf(story)) {
			JsonNode l = content.lesson(lessonId).orElseThrow();
			String status = done.contains(lessonId) ? "done" : previousDone ? "available" : "locked";
			out.add(new LessonSummary(lessonId, l.path("story").asString(), l.path("title").asString(),
					l.path("place").asString(), l.path("minutes").asInt(), l.path("xp").asInt(), status));
			previousDone = done.contains(lessonId);
		}
		return out;
	}

	record LessonSummary(String id, String story, String title, String place, int minutes, int xp, String status) {
	}

	record StepResult(@NotBlank String stepId, boolean correctFirstTry) {
	}

	record ResultRequest(@NotNull List<@Valid StepResult> steps, Map<String, Integer> scenarioChoices, String lang,
			LocalDate completedOn) {
	}

	record ResultResponse(int xpAwarded, boolean firstCompletion, int totalXp, String next) {
	}

}
