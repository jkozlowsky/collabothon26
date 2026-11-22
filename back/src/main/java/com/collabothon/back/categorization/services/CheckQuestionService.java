package com.collabothon.back.categorization.services;

import static com.collabothon.back.categorization.consts.CategorizationConsts.CHECKPOINT_PREFIX_PATTERN;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.collabothon.back.categorization.dto.CheckQuestionDto;
import com.collabothon.back.categorization.dto.HistoryEntryDto;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.mappers.CheckQuestionMapper;
import com.collabothon.back.categorization.models.Answer;
import com.collabothon.back.categorization.models.CheckLesson;
import com.collabothon.back.categorization.models.CheckQuestion;
import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.lesson.consts.LessonConsts;
import com.collabothon.back.lesson.models.Story;
import com.collabothon.back.lesson.repositories.LessonContentRepository;
import com.collabothon.back.lesson.repositories.StoryRepository;

import tools.jackson.databind.JsonNode;

@Service
public class CheckQuestionService {

	private final List<Story> stories;

	private final List<CheckQuestion> pool;

	private final CheckQuestionMapper mapper;

	CheckQuestionService(LessonContentRepository content, StoryRepository storyRepository, CheckQuestionMapper mapper) {
		this.mapper = mapper;
		this.stories = storyRepository.findAll();
		this.pool = readPool(content, stories);
		requireUniqueLabels(OrderRules.lessons(pool));
	}

	public List<CheckQuestionDto> questions() {
		return pool.stream().map(mapper::toDto).toList();
	}

	List<Story> stories() {
		return stories;
	}

	// In story order: stories.json, then each story's lessons, then each lesson's quiz steps.
	List<CheckQuestion> pool() {
		return pool;
	}

	List<Answer> resolve(List<HistoryEntryDto> history) {
		Map<String, CheckQuestion> notAnswered = new HashMap<>();
		pool.forEach(question -> notAnswered.put(question.id(), question));
		List<Answer> answers = new ArrayList<>();
		for (HistoryEntryDto entry : history) {
			CheckQuestion question = notAnswered.remove(entry.questionId());
			if (question == null) {
				throw new BusinessException(CategorizationErrorCode.ANSWER_EACH_QUESTION_ONCE);
			}
			Integer option = entry.optionIndex();
			if (option != null && option >= question.options().size()) {
				throw new BusinessException(CategorizationErrorCode.PICK_ONE_OPTION);
			}
			answers.add(new Answer(question, question.resultOf(option)));
		}
		return answers;
	}

	private static List<CheckQuestion> readPool(LessonContentRepository content, List<Story> stories) {
		List<CheckQuestion> questions = new ArrayList<>();
		for (Story story : stories) {
			FocusArea area = FocusArea.ofStoryArea(story.area());
			for (String lessonId : story.lessonIds()) {
				JsonNode node = content.findById(lessonId).orElseThrow().node();
				CheckLesson lesson = new CheckLesson(lessonId, story.id(), area, node.path("topic").asString(),
						strings(node.path("concepts")));
				questions.addAll(questionsOf(lesson, node.path("steps")));
			}
		}
		return List.copyOf(questions);
	}

	private static List<CheckQuestion> questionsOf(CheckLesson lesson, JsonNode steps) {
		return steps.valueStream()
			// A step that asks about its chart is left out, since the test shows none.
			.filter(step -> LessonConsts.QUIZ.equals(step.path("type").asString()) && !step.has("chart"))
			.map(step -> question(lesson, step))
			.toList();
	}

	private static CheckQuestion question(CheckLesson lesson, JsonNode step) {
		return new CheckQuestion(lesson.id() + "/" + step.path("id").asString(), lesson.id(), lesson.storyId(),
				lesson.area(), lesson.topic(), lesson.concepts(),
				step.path("prompt").asString().replaceFirst(CHECKPOINT_PREFIX_PATTERN, ""),
				strings(step.path("options")), step.path("correctIndex").asInt(), step.path("explanation").asString());
	}

	private static List<String> strings(JsonNode array) {
		return array.valueStream().map(JsonNode::asString).toList();
	}

	// Jev answers with a lesson's label, so two lessons must never share one.
	private static void requireUniqueLabels(List<CheckLesson> lessons) {
		if (lessons.stream().map(CheckLesson::label).distinct().count() != lessons.size()) {
			throw new IllegalStateException("Two lessons with a quiz share a topic");
		}
	}

}
