package com.collabothon.back.categorization.services;

import static com.collabothon.back.categorization.consts.JevQuestionConsts.CATEGORIZATION_QUESTIONS;
import static com.collabothon.back.categorization.consts.JevQuestionConsts.ENOUGH;
import static com.collabothon.back.categorization.consts.JevQuestionConsts.FIRST;
import static com.collabothon.back.categorization.consts.JevQuestionConsts.FIRST_LESSON;
import static com.collabothon.back.categorization.consts.JevQuestionConsts.MASTERY_PREFIX;
import static com.collabothon.back.categorization.consts.JevQuestionConsts.NEXT;
import static com.collabothon.back.categorization.consts.JevQuestionConsts.QUICK_CHECK_QUESTIONS;
import static com.collabothon.back.categorization.consts.JevQuestionConsts.STEP_QUESTIONS;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.util.ObjectUtils;

import com.collabothon.back.categorization.consts.JevConsts;
import com.collabothon.back.categorization.dto.FactsDto;
import com.collabothon.back.categorization.dto.JevInterestDto;
import com.collabothon.back.categorization.dto.JevRequestDto;
import com.collabothon.back.categorization.dto.OnboardingAnswersDto;
import com.collabothon.back.categorization.dto.ProfileRangesDto;
import com.collabothon.back.categorization.models.CheckLesson;
import com.collabothon.back.categorization.models.JevQuickCheck;
import com.collabothon.back.categorization.models.JevStepInput;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

// The insertion order of every state and question key is the order Jev receives.
final class JevRequests {

	private final String model;

	private final ObjectNode categorizationQuestions;

	private final ObjectNode quickCheckQuestions;

	private final ObjectNode stepQuestions;

	JevRequests(JsonMapper json, String model) {
		this.model = model;
		this.categorizationQuestions = (ObjectNode) json.readTree(CATEGORIZATION_QUESTIONS);
		this.quickCheckQuestions = (ObjectNode) json.readTree(QUICK_CHECK_QUESTIONS);
		this.stepQuestions = (ObjectNode) json.readTree(STEP_QUESTIONS);
	}

	JevRequestDto categorization(OnboardingAnswersDto answers, List<JevInterestDto> interests, FactsDto facts,
			Optional<JevQuickCheck> quickCheck) {
		Map<String, Object> state = new LinkedHashMap<>();
		putIfGiven(state, "answers", givenAnswers(answers));
		putIfGiven(state, "interests", interests);
		putIfGiven(state, "facts", facts);
		ObjectNode asked = categorizationQuestions.deepCopy();
		quickCheck.ifPresent(check -> addQuickCheck(state, asked, check));
		return new JevRequestDto(model, state, asked);
	}

	JevRequestDto step(JevStepInput input) {
		Map<String, Object> state = new LinkedHashMap<>();
		putIfGiven(state, "profile", givenProfile(input.profile()));
		putIfGiven(state, "interests", input.interests());
		putIfGiven(state, "facts", input.facts());
		putIfGiven(state, "answers", input.answers());
		return new JevRequestDto(model, state, questionsFor(input));
	}

	private void addQuickCheck(Map<String, Object> state, ObjectNode asked, JevQuickCheck check) {
		putIfGiven(state, "profile", givenProfile(check.profile()));
		// `answers` already names the onboarding answers, so the knowledge answers get their own key.
		state.put("checkAnswers", check.answers());
		if (!check.lessons().isEmpty()) {
			JsonNode question = quickCheckQuestions.get(FIRST_LESSON);
			asked.set(FIRST_LESSON, lessonChoice(question, check.lessons(), check.interestNotes()));
		}
	}

	private ObjectNode questionsFor(JevStepInput input) {
		ObjectNode asked = stepQuestions.objectNode();
		input.answeredAreas().stream()
			.map(area -> MASTERY_PREFIX + area.wire())
			// Only areas with lessons have a mastery question.
			.filter(stepQuestions::has)
			.forEach(key -> asked.set(key, stepQuestions.get(key).deepCopy()));
		boolean beforeFirstAnswer = input.answers().isEmpty();
		if (input.lessons().size() >= JevConsts.MIN_CHOICE_LABELS) {
			String wording = NEXT;
			if (beforeFirstAnswer) {
				wording = FIRST;
			}
			// Either wording is sent as the question `next`.
			asked.set(NEXT, lessonChoice(stepQuestions.get(wording), input.lessons(), Map.of()));
		}
		if (!beforeFirstAnswer) {
			asked.set(ENOUGH, stepQuestions.get(ENOUGH).deepCopy());
		}
		return asked;
	}

	private static ObjectNode lessonChoice(JsonNode question, List<CheckLesson> lessons, Map<String, String> notes) {
		ObjectNode choice = (ObjectNode) question.deepCopy();
		ObjectNode criteria = choice.putObject("criteria");
		for (CheckLesson lesson : lessons) {
			ObjectNode option = criteria.putObject(lesson.label()).put("topic", lesson.topic());
			ArrayNode concepts = option.putArray("concepts");
			lesson.concepts().forEach(concept -> concepts.add(concept.replace('-', ' ')));
			String note = notes.get(lesson.id());
			if (note != null) {
				option.put("personal_context", note);
			}
		}
		return choice;
	}

	private static Map<String, Object> givenAnswers(OnboardingAnswersDto answers) {
		Map<String, Object> given = new LinkedHashMap<>();
		putIfGiven(given, "lifeStage", answers.lifeStage());
		putIfGiven(given, "experience", answers.experience());
		if (answers.skipped()) {
			given.put("skipped", true);
		}
		return given;
	}

	private static Map<String, Object> givenProfile(ProfileRangesDto profile) {
		if (profile == null) {
			return Map.of();
		}
		Map<String, Object> given = new LinkedHashMap<>();
		putIfGiven(given, "ageBand", profile.ageBand());
		putIfGiven(given, "savingsCover", profile.savingsCover());
		putIfGiven(given, "horizon", profile.horizon());
		return given;
	}

	// The model can read a null or empty field as a signal, so such a field is not sent.
	private static void putIfGiven(Map<String, Object> state, String key, Object value) {
		if (!ObjectUtils.isEmpty(value)) {
			state.put(key, value);
		}
	}

}
