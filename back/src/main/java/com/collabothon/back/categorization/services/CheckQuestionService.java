package com.collabothon.back.categorization.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.collabothon.back.categorization.dto.CheckQuestionDto;
import com.collabothon.back.categorization.dto.HistoryEntryDto;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.mappers.CheckQuestionMapper;
import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.lesson.repositories.LessonContentRepository;

import tools.jackson.databind.JsonNode;

/** The Quick check's questions: the quiz steps of the lessons, read once from the lesson content. */
@Service
public class CheckQuestionService {

	private static final String QUIZ = "quiz";

	// A lesson counts its own quiz steps in the prompt ("Checkpoint 1 of 3 · "), which means nothing in the test.
	private static final String CHECKPOINT = "^Checkpoint \\d+ of \\d+ · ";

	private final List<CheckQuestion> pool;

	private final CheckQuestionMapper mapper;

	CheckQuestionService(LessonContentRepository content, CheckQuestionMapper mapper) {
		this.mapper = mapper;
		List<CheckQuestion> questions = new ArrayList<>();
		for (JsonNode story : content.stories()) {
			FocusArea area = FocusArea.ofStoryArea(story.path("area").asString());
			for (String lessonId : content.lessonIdsOf(story)) {
				JsonNode lesson = content.lesson(lessonId).orElseThrow();
				List<String> concepts = strings(lesson.path("concepts"));
				for (JsonNode step : lesson.path("steps")) {
					// Left out: a step that asks about its chart, since the test shows none.
					if (QUIZ.equals(step.path("type").asString()) && !step.has("chart")) {
						questions.add(new CheckQuestion(lessonId + "/" + step.path("id").asString(), lessonId,
								story.path("id").asString(), area, lesson.path("topic").asString(), concepts,
								step.path("prompt").asString().replaceFirst(CHECKPOINT, ""), strings(step.path("options")),
								step.path("correctIndex").asInt(), step.path("explanation").asString()));
					}
				}
			}
		}
		this.pool = List.copyOf(questions);
		List<CheckLesson> lessons = QuickCheckRules.lessons(pool);
		// Jev answers with a lesson's label, so two lessons must never share one.
		if (lessons.stream().map(CheckLesson::label).distinct().count() != lessons.size()) {
			throw new IllegalStateException("Two lessons with a quiz share a topic");
		}
	}

	private static List<String> strings(JsonNode array) {
		return array.valueStream().map(JsonNode::asString).toList();
	}

	public List<CheckQuestionDto> questions() {
		return pool.stream().map(mapper::toDto).toList();
	}

	/** In story order: the stories as stories.json lists them, their lessons, then each lesson's quiz steps. */
	List<CheckQuestion> pool() {
		return pool;
	}

	/** The history checked against the pool; the messages never repeat a rejected value. */
	List<Answer> resolve(List<HistoryEntryDto> history) {
		Map<String, CheckQuestion> byId = pool.stream().collect(Collectors.toMap(CheckQuestion::id, Function.identity()));
		List<Answer> answers = new ArrayList<>();
		for (HistoryEntryDto entry : history) {
			CheckQuestion question = byId.remove(entry.questionId());
			if (question == null) {
				throw new BusinessException(CategorizationErrorCode.ANSWER_EACH_QUESTION_ONCE);
			}
			if (entry.optionIndex() != null && entry.optionIndex() >= question.options().size()) {
				throw new BusinessException(CategorizationErrorCode.PICK_ONE_OPTION);
			}
			answers.add(new Answer(question, entry.optionIndex()));
		}
		return answers;
	}

}
