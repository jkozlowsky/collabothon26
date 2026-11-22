package com.collabothon.back.lesson.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.common.consts.WebConsts;
import com.collabothon.back.dto.lesson.LessonSummary;
import com.collabothon.back.entities.profile.UserProfile;
import com.collabothon.back.glossary.repositories.GlossaryContentRepository;
import com.collabothon.back.lesson.consts.LessonConsts;
import com.collabothon.back.lesson.models.LessonContentItem;
import com.collabothon.back.lesson.models.LessonJson;
import com.collabothon.back.lesson.models.Story;
import com.collabothon.back.lesson.repositories.StoryRepository;
import com.collabothon.back.profile.consts.ProfileConsts;
import com.collabothon.back.profile.repositories.UserProfileRepository;
import com.collabothon.back.profile.services.UserProfileService;

import lombok.RequiredArgsConstructor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

@Service
@RequiredArgsConstructor
public class LessonService {

	private final StoryRepository stories;

	private final GlossaryContentRepository glossaryContent;

	private final UserProfileRepository profiles;

	private final LessonProgression progression;

	private final UserProfileService userProfileService;

	@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
	public List<ObjectNode> getStories(String userId) {
		Set<String> done = progression.completedLessonIds(userId);
		List<ObjectNode> views = new ArrayList<>();
		boolean currentTaken = false;
		for (Story story : stories.findAll()) {
			List<LessonSummary> lessons = progression.summaries(story, done);
			Optional<LessonSummary> next = lessons.stream().filter(lesson -> !isDone(lesson)).findFirst();
			// Only the first available story with a lesson left is current.
			boolean current = !currentTaken && next.isPresent() && LessonConsts.STORY_AVAILABLE.equals(story.status());
			currentTaken = currentTaken || current;

			ObjectNode view = storyView(story, lessons);
			view.putPOJO("nextLesson", next.orElse(null));
			view.put("current", current);
			views.add(view);
		}
		return views;
	}

	@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
	public List<LessonSummary> getLessons(String userId) {
		Set<String> done = progression.completedLessonIds(userId);
		return stories.findAll().stream().flatMap(story -> progression.summaries(story, done).stream()).toList();
	}

	// Both play orders go out together, so switching mode mid-lesson needs no reload.
	@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
	public ObjectNode getLesson(String id, String userId) {
		LessonContentItem lesson = progression.lessonOrNotFound(id);
		progression.requireUnlocked(lesson, userId);

		ObjectNode view = LessonJson.applyVariants(lesson.node(), variantKeys(userId));
		putPathPosition(view, lesson);
		putGlossary(view);
		putPlayMode(view, userId);
		putStoryLook(view, stories.findById(lesson.story()).orElseThrow());
		view.put("audioBase", WebConsts.AUDIO_BASE);
		return view;
	}

	private static ObjectNode storyView(Story story, List<LessonSummary> lessons) {
		ObjectNode view = (ObjectNode) story.rawNode().deepCopy();
		view.remove("lessonIds");
		view.putPOJO("lessons", lessons);
		long completed = lessons.stream().filter(LessonService::isDone).count();
		view.putObject("progress").put("done", completed).put("total", lessons.size());
		return view;
	}

	private static boolean isDone(LessonSummary lesson) {
		return LessonConsts.STATUS_DONE.equals(lesson.status());
	}

	private void putPathPosition(ObjectNode view, LessonContentItem lesson) {
		List<String> ids = progression.storyLessonIds(lesson);
		view.put("position", ids.indexOf(lesson.id()) + 1);
		view.put("total", ids.size());
		view.put("next", progression.nextLessonId(lesson));
	}

	private void putGlossary(ObjectNode view) {
		ObjectNode glossary = view.putObject("glossary");
		for (String concept : LessonJson.concepts(view)) {
			glossaryContent.findByConcept(concept).ifPresent(entry -> glossary.set(concept, entry));
		}
	}

	private void putPlayMode(ObjectNode view, String userId) {
		if (view.hasNonNull("video")) {
			view.put("startMode", userProfileService.lessonMode(userId));
			return;
		}
		view.putNull("video");
		view.put("startMode", ProfileConsts.LESSON_MODE_CLASSIC);
	}

	private static void putStoryLook(ObjectNode view, Story story) {
		JsonNode content = story.rawNode();
		view.put("city", story.city());
		view.put("color", content.path("color").asString(LessonConsts.DEFAULT_STORY_COLOR));
		if (content.hasNonNull("landmark")) {
			view.set("landmark", content.get("landmark").deepCopy());
		}
		else {
			view.putNull("landmark");
		}
	}

	private List<String> variantKeys(String userId) {
		List<String> keys = new ArrayList<>();
		findProfile(userId).ifPresent(profile -> {
			levelKey(profile.getExperience()).ifPresent(keys::add);
			personaKey(profile.getLifeStage()).ifPresent(keys::add);
		});
		return keys;
	}

	private Optional<UserProfile> findProfile(String userId) {
		if (userId == null) {
			return Optional.empty();
		}
		return profiles.findById(userId);
	}

	private static Optional<String> levelKey(String experience) {
		return switch (experience) {
			case ProfileConsts.EXPERIENCE_NOT_SAVING, ProfileConsts.EXPERIENCE_OCCASIONAL ->
				Optional.of(LessonConsts.LEVEL_BEGINNER);
			case ProfileConsts.EXPERIENCE_INVESTING, ProfileConsts.EXPERIENCE_PLANNING ->
				Optional.of(LessonConsts.LEVEL_ADVANCED);
			case null, default -> Optional.empty();
		};
	}

	private static Optional<String> personaKey(String lifeStage) {
		return switch (lifeStage) {
			case ProfileConsts.LIFE_STAGE_STARTING_OUT -> Optional.of(LessonConsts.PERSONA_STUDENT);
			case ProfileConsts.LIFE_STAGE_BUILDING -> Optional.of(LessonConsts.PERSONA_FAMILY);
			case ProfileConsts.LIFE_STAGE_LATER_LIFE -> Optional.of(LessonConsts.PERSONA_PRE_RETIREMENT);
			case null, default -> Optional.empty();
		};
	}

}
