package com.collabothon.back.categorization.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.dto.ConfidenceGapDto;
import com.collabothon.back.categorization.enums.Confidence;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.GapDirection;
import com.collabothon.back.categorization.enums.QuestionLevel;
import com.collabothon.back.categorization.repositories.projections.CheckQuestionProjection;

class QuickCheckRulesTests {

	private static final double EPSILON = 1e-9;

	private static final FocusArea SAVING = FocusArea.SAVING;

	private static final FocusArea INVESTING = FocusArea.INVESTING;

	// Lesson 1 and 3 are saving lessons, 2 and 4 investing ones; each area has two easy and one hard question.
	private static final CheckQuestionProjection S_EASY_1 = q("s-easy-1", 1, SAVING, QuestionLevel.EASY);

	private static final CheckQuestionProjection S_EASY_2 = q("s-easy-2", 3, SAVING, QuestionLevel.EASY);

	private static final CheckQuestionProjection S_HARD = q("s-hard", 1, SAVING, QuestionLevel.HARD);

	private static final CheckQuestionProjection I_EASY = q("i-easy", 2, INVESTING, QuestionLevel.EASY);

	private static final CheckQuestionProjection SHORT_FALL = q(CategorizationConsts.SHORT_HORIZON_QUESTION_ID, 2,
			INVESTING, QuestionLevel.EASY);

	private static final CheckQuestionProjection I_HARD = q("i-hard", 4, INVESTING, QuestionLevel.HARD);

	private static final List<CheckQuestionProjection> BANK = List.of(I_EASY, I_HARD, S_EASY_1, S_EASY_2, S_HARD,
			SHORT_FALL);

	private static final List<FocusArea> ORDER = List.of(SAVING, INVESTING);

	private static final List<BankLesson> LESSONS = QuickCheckRules.lessons(BANK);

	/** Option 0 is correct; options 1 and 2 carry misconceptions. Lesson position = lesson id. */
	private static CheckQuestionProjection q(String id, long lessonId, FocusArea area, QuestionLevel level) {
		return new CheckQuestionProjection(id, lessonId, "Lesson " + lessonId, "Summary " + lessonId, (int) lessonId,
				area, level, null, List.of(), "Prompt " + id, List.of("a", "b", "c"), 0,
				Arrays.asList(null, "m1-" + id, "m2-" + id), "Checks " + id);
	}

	private static Answer right(CheckQuestionProjection q, Confidence c) {
		return new Answer(q, 0, c);
	}

	private static Answer wrong(CheckQuestionProjection q, Confidence c) {
		return new Answer(q, 1, c);
	}

	private static Answer notSure(CheckQuestionProjection q) {
		return new Answer(q, null, null);
	}

	private static Optional<String> next(String horizon, Answer... answers) {
		return QuickCheckRules.next(ORDER, BANK, List.of(answers), horizon).map(CheckQuestionProjection::id);
	}

	private static Map<FocusArea, Double> mastery(Answer... answers) {
		return QuickCheckRules.mastery(ORDER, List.of(answers));
	}

	private static LessonPlan plan(Set<Long> completed, Answer... answers) {
		List<Answer> list = List.of(answers);
		Map<FocusArea, Double> mastery = QuickCheckRules.mastery(ORDER, list);
		List<BankLesson> candidates = QuickCheckRules.candidates(LESSONS, ORDER, mastery, list, completed);
		return QuickCheckRules.plan(LESSONS, candidates, null, ORDER, mastery, list, completed);
	}

	private static Map<FocusArea, GapDirection> ruleGaps(List<Answer> answers) {
		Map<FocusArea, Double> mastery = QuickCheckRules.mastery(ORDER, answers);
		Map<FocusArea, GapDirection> gaps = new LinkedHashMap<>();
		for (FocusArea area : ORDER) {
			QuickCheckRules.ruleGap(QuickCheckRules.inArea(answers, area), mastery.get(area))
				.ifPresent(direction -> gaps.put(area, direction));
		}
		return gaps;
	}

	@Test
	void eachAnswerScoresByResultAndChipAndAnAreaIsTheirMean() {
		assertEquals(0.85, mastery(right(S_EASY_1, Confidence.SURE)).get(SAVING), EPSILON);
		assertEquals(0.75, mastery(right(S_EASY_1, Confidence.FAIRLY_SURE)).get(SAVING), EPSILON);
		assertEquals(0.6, mastery(right(S_EASY_1, Confidence.GUESSING)).get(SAVING), EPSILON);
		assertEquals(0.25, mastery(wrong(S_EASY_1, Confidence.SURE)).get(SAVING), EPSILON);
		assertEquals(0.25, mastery(notSure(S_EASY_1)).get(SAVING), EPSILON);
		Map<FocusArea, Double> mixed = mastery(right(S_EASY_1, Confidence.SURE), wrong(S_EASY_2, Confidence.GUESSING));
		assertEquals(0.55, mixed.get(SAVING), EPSILON);
		assertTrue(mixed.containsKey(INVESTING));
		assertNull(mixed.get(INVESTING));
	}

	@Test
	void confidenceIsTheMeanChipWithNotSureCountedAsGuessing() {
		Map<FocusArea, Double> confidence = QuickCheckRules.confidence(ORDER,
				List.of(right(S_EASY_1, Confidence.SURE), notSure(S_EASY_2)));

		assertEquals((0.9 + 0.25) / 2, confidence.get(SAVING), EPSILON);
		assertNull(confidence.get(INVESTING));
	}

	@Test
	void goalAreasComeFirstThenTheFixedOrderKeepingOnlyBankAreas() {
		assertEquals(List.of(SAVING, INVESTING), QuickCheckRules.areaOrder(List.of(), null, BANK));
		assertEquals(List.of(INVESTING, SAVING), QuickCheckRules.areaOrder(List.of("stocks-etfs"), "5y+", BANK));
		assertEquals(List.of(SAVING, INVESTING),
				QuickCheckRules.areaOrder(List.of("stocks-etfs"), CategorizationConsts.HORIZON_WITHIN_1Y, BANK));
		assertEquals(List.of(INVESTING), QuickCheckRules.areaOrder(List.of("retirement"), null, List.of(I_EASY)));
	}

	@Test
	void anEmptyHistoryStartsWithTheFirstAreasEasyQuestion() {
		assertEquals(Optional.of("s-easy-1"), next(null));
	}

	@Test
	void aWrongOrNotSureAnswerStaysInTheAreaWithAnEasyQuestion() {
		assertEquals(Optional.of("s-easy-2"), next(null, wrong(S_EASY_1, Confidence.SURE)));
		assertEquals(Optional.of("s-easy-2"), next(null, notSure(S_EASY_1)));
	}

	@Test
	void withoutAnEasyQuestionLeftAWrongAnswerMovesToTheNextRule() {
		assertEquals(Optional.of("i-easy"),
				next(null, right(S_EASY_1, Confidence.SURE), wrong(S_EASY_2, Confidence.SURE)));
	}

	@Test
	void aCorrectAnswerMovesToTheFirstUnansweredArea() {
		assertEquals(Optional.of("i-easy"), next(null, right(S_EASY_1, Confidence.SURE)));
	}

	@Test
	void withEveryAreaAnsweredTheWeakestAreaGoesNextEasyBeforeHard() {
		// Saving 0.85, investing 0.6: investing is weaker, its next easy question comes before the hard one.
		assertEquals(Optional.of(SHORT_FALL.id()),
				next(null, right(S_EASY_1, Confidence.SURE), right(I_EASY, Confidence.GUESSING)));
		assertEquals(Optional.of("i-hard"), next(null, right(S_EASY_1, Confidence.SURE),
				right(I_EASY, Confidence.GUESSING), right(SHORT_FALL, Confidence.GUESSING)));
	}

	@Test
	void aMasteryTieGoesToTheAreaOrderAndAnExhaustedAreaToTheNext() {
		assertEquals(Optional.of("s-easy-2"),
				next(null, right(S_EASY_1, Confidence.SURE), right(I_EASY, Confidence.SURE)));
		// Saving is weakest (0.25) but all its questions are asked, so investing comes next.
		assertEquals(Optional.of(SHORT_FALL.id()), next(null, right(I_EASY, Confidence.SURE), notSure(S_EASY_1),
				notSure(S_EASY_2), notSure(S_HARD)));
	}

	@Test
	void aShortHorizonServesTheShortTermFallForInvesting() {
		assertEquals(Optional.of(SHORT_FALL.id()),
				next(CategorizationConsts.HORIZON_WITHIN_1Y, right(S_EASY_1, Confidence.SURE)));
		assertEquals(Optional.of("i-easy"), next(CategorizationConsts.HORIZON_WITHIN_1Y,
				right(S_EASY_1, Confidence.SURE), wrong(SHORT_FALL, Confidence.SURE)));
	}

	@Test
	void theRuleStopsAtFourAnswersOrAtThreeCoveringEveryArea() {
		List<Answer> three = List.of(right(S_EASY_1, Confidence.SURE), right(S_EASY_2, Confidence.SURE),
				right(S_HARD, Confidence.SURE));
		assertFalse(QuickCheckRules.ruleDone(ORDER, QuickCheckRules.unasked(BANK, three), three));
		List<Answer> covering = List.of(right(S_EASY_1, Confidence.SURE), right(S_EASY_2, Confidence.SURE),
				right(I_EASY, Confidence.SURE));
		assertTrue(QuickCheckRules.ruleDone(ORDER, QuickCheckRules.unasked(BANK, covering), covering));
		List<Answer> four = List.of(right(S_EASY_1, Confidence.SURE), right(S_EASY_2, Confidence.SURE),
				right(S_HARD, Confidence.SURE), notSure(I_EASY));
		assertTrue(QuickCheckRules.ruleDone(ORDER, QuickCheckRules.unasked(BANK, four), four));
		List<Answer> one = List.of(right(S_EASY_1, Confidence.SURE));
		assertTrue(QuickCheckRules.ruleDone(ORDER, List.of(), one));
	}

	@Test
	void jevStopsAtSixAtNoQuestionLeftOrWhenEnoughAfterThree() {
		List<Answer> two = List.of(notSure(S_EASY_1), notSure(S_EASY_2));
		assertFalse(QuickCheckRules.jevDone(QuickCheckRules.unasked(BANK, two), two, 0.99));
		List<Answer> three = List.of(notSure(S_EASY_1), notSure(S_EASY_2), notSure(S_HARD));
		assertFalse(QuickCheckRules.jevDone(QuickCheckRules.unasked(BANK, three), three, 0.69));
		assertTrue(QuickCheckRules.jevDone(QuickCheckRules.unasked(BANK, three), three, 0.7));
		List<Answer> six = BANK.stream().map(QuickCheckRulesTests::notSure).toList();
		assertTrue(QuickCheckRules.jevDone(List.of(I_EASY), six, 0));
		assertTrue(QuickCheckRules.jevDone(List.of(), three, 0));
	}

	@Test
	void overNeedsAWrongSureAnswer() {
		assertEquals(Map.of(SAVING, GapDirection.OVER),
				ruleGaps(List.of(right(S_EASY_1, Confidence.SURE), wrong(S_EASY_2, Confidence.SURE))));
		assertEquals(Map.of(), ruleGaps(List.of(wrong(S_EASY_1, Confidence.FAIRLY_SURE), notSure(S_EASY_2))));
	}

	@Test
	void underNeedsACorrectUnsureAnswerNoWrongSureAndMasteryFromJustStarting() {
		assertEquals(Map.of(SAVING, GapDirection.UNDER), ruleGaps(List.of(right(S_EASY_1, Confidence.GUESSING))));
		assertEquals(Map.of(), ruleGaps(List.of(right(S_EASY_1, Confidence.SURE))));
		// 0.6, 0.25, 0.25: mastery 0.37 is below 0.4, so the rule keeps quiet although the chips would allow it.
		List<Answer> weak = List.of(right(S_EASY_1, Confidence.GUESSING), wrong(S_EASY_2, Confidence.GUESSING),
				notSure(S_HARD));
		assertTrue(QuickCheckRules.underHolds(weak));
		assertEquals(Map.of(), ruleGaps(weak));
	}

	@Test
	void aJevLabelWithoutItsPreconditionReadsAsAligned() {
		List<Answer> sureAndRight = List.of(right(S_EASY_1, Confidence.SURE));
		assertEquals(Optional.empty(), QuickCheckRules.checkedJevGap(GapDirection.UNDER, sureAndRight));
		assertEquals(Optional.empty(), QuickCheckRules.checkedJevGap(GapDirection.OVER, sureAndRight));
		assertEquals(Optional.empty(), QuickCheckRules.checkedJevGap(GapDirection.ALIGNED, sureAndRight));
		List<Answer> guessedRight = List.of(right(S_EASY_1, Confidence.GUESSING));
		assertEquals(Optional.of(GapDirection.UNDER), QuickCheckRules.checkedJevGap(GapDirection.UNDER, guessedRight));
	}

	@Test
	void gapCardsPutUnderFirstQuoteTheRightChipAndNameTheFirstLesson() {
		List<Answer> answers = List.of(wrong(S_EASY_1, Confidence.SURE), right(S_EASY_2, Confidence.GUESSING),
				right(I_EASY, Confidence.FAIRLY_SURE), right(SHORT_FALL, Confidence.GUESSING));
		Map<FocusArea, GapDirection> gaps = new LinkedHashMap<>();
		gaps.put(SAVING, GapDirection.OVER);
		gaps.put(INVESTING, GapDirection.UNDER);

		assertEquals(List.of(
				new ConfidenceGapDto(INVESTING, GapDirection.UNDER,
						"On Investing you said “Guessing”, yet your answers show you already understand how it works."),
				new ConfidenceGapDto(SAVING, GapDirection.OVER,
						"On Saving you said “Sure”. Your answers leave a few things open, which is where your first"
								+ " lesson starts.")),
				QuickCheckRules.gapCards(gaps, answers, SAVING));
		assertEquals("On Saving you said “Sure”. Your answers leave a few things open to explore.",
				QuickCheckRules.gapCards(Map.of(SAVING, GapDirection.OVER), answers, INVESTING).getFirst().because());
	}

	@Test
	void atMostTwoGapCards() {
		List<Answer> answers = List.of(right(S_EASY_1, Confidence.GUESSING), right(I_EASY, Confidence.GUESSING),
				right(q("r", 5, FocusArea.RISK, QuestionLevel.EASY), Confidence.GUESSING));
		Map<FocusArea, GapDirection> gaps = new LinkedHashMap<>();
		gaps.put(SAVING, GapDirection.UNDER);
		gaps.put(INVESTING, GapDirection.UNDER);
		gaps.put(FocusArea.RISK, GapDirection.UNDER);

		assertEquals(List.of(SAVING, INVESTING),
				QuickCheckRules.gapCards(gaps, answers, null).stream().map(ConfidenceGapDto::area).toList());
	}

	@Test
	void theWeakestAreasLowestScoredAnswerGivesTheFirstLesson() {
		// Saving 0.55 (lesson 1 at 0.85, lesson 3 at 0.25) is weaker than investing 0.85.
		LessonPlan plan = plan(Set.of(), right(S_EASY_1, Confidence.SURE), notSure(S_EASY_2),
				right(I_EASY, Confidence.SURE));

		assertEquals(3L, plan.start().id());
		assertFalse(plan.readyForNext());
		// Then the rest of saving, then investing; unanswered areas would follow.
		assertEquals(List.of(3L, 1L, 2L, 4L), plan.pathLessonIds());
	}

	@Test
	void aTieInScoreGoesToTheEarlierAnswer() {
		assertEquals(3L, plan(Set.of(), notSure(S_EASY_2), notSure(S_EASY_1)).start().id());
		assertEquals(1L, plan(Set.of(), notSure(S_EASY_1), notSure(S_EASY_2)).start().id());
	}

	@Test
	void aLessonCompletedBeforeTheTestIsSkipped() {
		LessonPlan plan = plan(Set.of(3L), right(S_EASY_1, Confidence.SURE), notSure(S_EASY_2),
				right(I_EASY, Confidence.SURE));

		assertEquals(1L, plan.start().id());
		assertEquals(List.of(1L, 2L, 4L), plan.pathLessonIds());
	}

	@Test
	void unansweredAreasRankAfterAnsweredOnesAndGiveTheirLowestLesson() {
		LessonPlan answeredInvesting = plan(Set.of(), right(I_EASY, Confidence.SURE));
		assertEquals(2L, answeredInvesting.start().id());
		assertEquals(List.of(2L, 4L, 1L, 3L), answeredInvesting.pathLessonIds());

		LessonPlan none = plan(Set.of());
		assertEquals(1L, none.start().id());
		assertEquals(List.of(1L, 3L, 2L, 4L), none.pathLessonIds());
	}

	@Test
	void aSolidAreaHasNoCandidatesButOneStrongAnswerIsOnlyBuilding() {
		LessonPlan oneAnswer = plan(Set.of(), right(S_EASY_1, Confidence.SURE));
		assertEquals(1L, oneAnswer.start().id());

		LessonPlan solidSaving = plan(Set.of(), right(S_EASY_1, Confidence.SURE), right(S_EASY_2, Confidence.SURE));
		assertEquals(List.of(2L, 4L), solidSaving.pathLessonIds());
	}

	@Test
	void withEveryAreaSolidTheHighestUncompletedLessonIsReadyForNext() {
		Answer[] allSure = { right(S_EASY_1, Confidence.SURE), right(S_EASY_2, Confidence.SURE),
				right(I_EASY, Confidence.SURE), right(SHORT_FALL, Confidence.SURE) };

		LessonPlan plan = plan(Set.of(), allSure);
		assertEquals(4L, plan.start().id());
		assertTrue(plan.readyForNext());
		assertEquals(List.of(4L), plan.pathLessonIds());

		assertEquals(3L, plan(Set.of(4L), allSure).start().id());
		LessonPlan nothingLeft = plan(Set.of(1L, 2L, 3L, 4L), allSure);
		assertNull(nothingLeft.start());
		assertEquals(List.of(), nothingLeft.pathLessonIds());
	}

	@Test
	void onlyAreasWithAChipCanHaveAGap() {
		assertEquals(List.of(INVESTING), QuickCheckRules.chipAreas(ORDER,
				List.of(notSure(S_EASY_1), right(I_EASY, Confidence.SURE))));
	}

}
