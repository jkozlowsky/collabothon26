package com.collabothon.back.lesson.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.dto.lesson.LessonSummary;
import com.collabothon.back.entities.profile.UserProfile;
import com.collabothon.back.glossary.repositories.GlossaryContentRepository;
import com.collabothon.back.lesson.repositories.StoryRepository;
import com.collabothon.back.profile.repositories.UserProfileRepository;
import com.collabothon.back.profile.services.UserProfileService;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/** The lesson map and single lessons, personalised by the user's progress and onboarding profile. */
@Service
@RequiredArgsConstructor
public class LessonService {

	/** Spring serves {@code resources/static/audio/} here; scene {@code audio} paths are relative to it. */
	static final String AUDIO_BASE = "/audio/";

	private final StoryRepository storyRepo;

	private final GlossaryContentRepository glossaryContentRepo;

	private final UserProfileRepository userProfileRepo;

	private final LessonProgression progression;

	private final UserProfileService userProfileService;

	/** Every story with its lessons and progress; the first available story with lessons left is "current". */
	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public List<ObjectNode> getStories(String userId) {
		Set<String> done = progression.completedLessonIds(userId);
		List<ObjectNode> out = new ArrayList<>();
		boolean currentTaken = false;
		for (JsonNode storyNode : storyRepo.rawStories()) {
			ObjectNode story = (ObjectNode) storyNode.deepCopy();
			story.remove("lessonIds");
			List<LessonSummary> lessons = progression.summaries(storyNode, done);
			long completed = lessons.stream().filter(l -> LessonProgression.DONE.equals(l.status())).count();
			story.putPOJO("lessons", lessons);
			story.putObject("progress").put("done", completed).put("total", lessons.size());
			LessonSummary next = lessons.stream()
				.filter(l -> !LessonProgression.DONE.equals(l.status()))
				.findFirst()
				.orElse(null);
			story.putPOJO("nextLesson", next);
			boolean current = !currentTaken && next != null && "available".equals(storyNode.path("status").asString());
			currentTaken = currentTaken || current;
			story.put("current", current);
			out.add(story);
		}
		return out;
	}

	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public List<LessonSummary> getLessons(String userId) {
		Set<String> done = progression.completedLessonIds(userId);
		List<LessonSummary> out = new ArrayList<>();
		for (JsonNode story : storyRepo.rawStories()) {
			out.addAll(progression.summaries(story, done));
		}
		return out;
	}

	/**
	 * The lesson with the variants for the user's level and persona applied, plus its glossary. Lessons with a video
	 * track carry both play orders, so switching mode mid-lesson needs no reload.
	 */
	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public ObjectNode getLesson(String id, String userId) {
		ObjectNode base = progression.lessonOrNotFound(id);
		progression.requireUnlocked(base, userId);

		ObjectNode lesson = LessonRules.applyVariants(base, variantKeys(userId));
		List<String> ids = progression.storyLessonIds(lesson);
		lesson.put("position", ids.indexOf(id) + 1);
		lesson.put("total", ids.size());
		lesson.put("next", progression.nextLessonId(lesson));

		ObjectNode glossary = lesson.putObject("glossary");
		for (String concept : LessonRules.concepts(lesson)) {
			glossaryContentRepo.findByConcept(concept).ifPresent(c -> glossary.set(concept, c));
		}

		boolean video = lesson.hasNonNull("video");
		if (!video) {
			lesson.putNull("video");
		}
		lesson.put("startMode", video ? userProfileService.lessonMode(userId) : "classic");
		JsonNode story = storyRepo.findRawById(lesson.path("story").asString()).orElseThrow();
		lesson.put("city", story.path("city").asString());
		lesson.put("color", story.path("color").asString("slate"));
		if (story.hasNonNull("landmark")) {
			lesson.set("landmark", story.get("landmark").deepCopy());
		}
		else {
			lesson.putNull("landmark");
		}
		lesson.put("audioBase", AUDIO_BASE);
		return lesson;
	}

	private List<String> variantKeys(String userId) {
		List<String> keys = new ArrayList<>();
		profile(userId).ifPresent(profile -> {
			levelKey(profile.getExperience()).ifPresent(keys::add);
			personaKey(profile.getLifeStage()).ifPresent(keys::add);
		});
		return keys;
	}

	private Optional<UserProfile> profile(String userId) {
		if (userId == null) {
			return Optional.empty();
		}
		return userProfileRepo.findById(userId);
	}

	private static Optional<String> levelKey(String experience) {
		if (experience == null) {
			return Optional.empty();
		}
		return switch (experience) {
			case "not-saving", "occasional" -> Optional.of("level:beginner");
			case "investing", "planning" -> Optional.of("level:advanced");
			default -> Optional.empty();
		};
	}

	private static Optional<String> personaKey(String lifeStage) {
		if (lifeStage == null) {
			return Optional.empty();
		}
		return switch (lifeStage) {
			case "starting-out" -> Optional.of("persona:student");
			case "building" -> Optional.of("persona:family");
			case "later-life" -> Optional.of("persona:pre-retirement");
			default -> Optional.empty();
		};
	}

}
