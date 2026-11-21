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
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.mappers.BankLessonMapper;
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

	// Story sN holds lessons sN-1 and sN-2; only sN-1 has questions. s1 and s3 are saving, s2 and s4 investing;
	// each area has two easy and one hard question.
	private static final CheckQuestionProjection S_EASY_1 = q("s-easy-1", "s1-1", SAVING, QuestionLevel.EASY);

	private static final CheckQuestionProjection S_EASY_2 = q("s-easy-2", "s3-1", SAVING, QuestionLevel.EASY);

	private static final CheckQuestionProjection S_HARD = q("s-hard", "s1-1", SAVING, QuestionLevel.HARD);

	private static final CheckQuestionProjection I_EASY = q("i-easy", "s2-1", INVESTING, QuestionLevel.EASY);

	private static final CheckQuestionProjection SHORT_FALL = q(CategorizationConsts.LONG_HORIZON_QUESTION_ID, "s2-1",
			INVESTING, QuestionLevel.EASY);

	private static final CheckQuestionProjection I_HARD = q("i-hard", "s4-1", INVESTING, QuestionLevel.HARD);

	private static final List<CheckQuestionProjection> BANK = List.of(I_EASY, I_HARD, S_EASY_1, S_EASY_2, S_HARD,
			SHORT_FALL);

	private static final List<FocusArea> ORDER = List.of(SAVING, INVESTING);

	private static final List<BankLesson> LESSONS = QuickCheckRules.lessons(BANK, Mappers.getMapper(BankLessonMapper.class)::toLesson);

	private static final List<Story> STORIES = List.of(story("s1"), story("s2"), story("s3"), story("s4"));

	private static Story story(String id) {
		return new Story(id, "City " + id, "Topic " + id, List.of(id + "-1", id + "-2"));
	}

	private static Set<String> done(String... storyIds) {
		return Arrays.stream(storyIds).flatMap(id -> story(id).lessonIds().stream()).collect(Collectors.toSet());
	}

	/** Option 0 is correct; options 1 and 2 carry misconceptions. */
	private static CheckQuestionProjection q(String id, String lessonId, FocusArea area, QuestionLevel level) {
		return new CheckQuestionProjection(id, lessonId, area, level, null, List.of(), "Prompt " + id,
				List.of("a", "b", "c"), 0, Arrays.asList(null, "m1-" + id, "m2-" + id), "Checks " + id);
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

	private static StoryPlan plan(Set<String> completed, Answer... answers) {
		List<Answer> list = List.of(answers);
		Map<FocusArea, Double> mastery = QuickCheckRules.mastery(ORDER, list);
		List<BankLesson> candidates = QuickCheckRules.candidates(LESSONS, STORIES, ORDER, mastery, list, completed);
		return QuickCheckRules.plan(STORIES, candidates, null, ORDER, mastery, list, completed);
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
	void aShortHorizonServesTheFallBeforeYouNeedItForSavingAndNeverTheShortTermFall() {
		String within1y = CategorizationConsts.HORIZON_WITHIN_1Y;
		CheckQuestionProjection aSaving = q("a-saving", "s1-1", SAVING, QuestionLevel.EASY);
		CheckQuestionProjection fallBefore = q(CategorizationConsts.SHORT_HORIZON_QUESTION_ID, "s1-1", SAVING,
				QuestionLevel.EASY);
		List<CheckQuestionProjection> bank = List.of(aSaving, fallBefore, I_EASY, SHORT_FALL);
		List<CheckQuestionProjection> shortBank = QuickCheckRules.forHorizon(bank, within1y);

		assertEquals(List.of(aSaving, fallBefore, I_EASY), shortBank);
		assertEquals(bank, QuickCheckRules.forHorizon(bank, "5y+"));
		assertEquals(Optional.of(fallBefore), QuickCheckRules.next(ORDER, shortBank, List.of(), within1y));
		assertEquals(Optional.of(aSaving), QuickCheckRules.next(ORDER, bank, List.of(), "5y+"));
		// No easy investing question is left once i-easy is wrong, so saving comes back instead of the short-term fall.
		assertEquals(Optional.of(aSaving), QuickCheckRules.next(ORDER, shortBank,
				List.of(right(fallBefore, Confidence.SURE), wrong(I_EASY, Confidence.SURE)), within1y));
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
				right(q("r", "s5-1", FocusArea.RISK, QuestionLevel.EASY), Confidence.GUESSING));
		Map<FocusArea, GapDirection> gaps = new LinkedHashMap<>();
		gaps.put(SAVING, GapDirection.UNDER);
		gaps.put(INVESTING, GapDirection.UNDER);
		gaps.put(FocusArea.RISK, GapDirection.UNDER);

		assertEquals(List.of(SAVING, INVESTING),
				QuickCheckRules.gapCards(gaps, answers, null).stream().map(ConfidenceGapDto::area).toList());
	}

	@Test
	void theWeakestAreasLowestScoredAnswerGivesTheFirstStory() {
		// Saving 0.55 (s1 at 0.85, s3 at 0.25) is weaker than investing 0.85.
		StoryPlan plan = plan(Set.of(), right(S_EASY_1, Confidence.SURE), notSure(S_EASY_2),
				right(I_EASY, Confidence.SURE));

		assertEquals("s3", plan.start().id());
		assertFalse(plan.readyForNext());
		// Then the rest of saving, then investing; unanswered areas would follow.
		assertEquals(List.of("s3", "s1", "s2", "s4"), plan.pathStoryIds());
	}

	@Test
	void aTieInScoreGoesToTheEarlierAnswer() {
		assertEquals("s3", plan(Set.of(), notSure(S_EASY_2), notSure(S_EASY_1)).start().id());
		assertEquals("s1", plan(Set.of(), notSure(S_EASY_1), notSure(S_EASY_2)).start().id());
	}

	@Test
	void aStoryWithEveryLessonDoneIsSkippedButOneWithALessonLeftStays() {
		Answer[] answers = { right(S_EASY_1, Confidence.SURE), notSure(S_EASY_2), right(I_EASY, Confidence.SURE) };

		StoryPlan allDone = plan(done("s3"), answers);
		assertEquals("s1", allDone.start().id());
		assertEquals(List.of("s1", "s2", "s4"), allDone.pathStoryIds());

		StoryPlan bankLessonDone = plan(Set.of("s3-1"), answers);
		assertEquals("s3", bankLessonDone.start().id());
	}

	@Test
	void theStartLessonIsTheStorysFirstLessonNotDone() {
		assertEquals(Optional.of("s3-1"), QuickCheckRules.startLesson(story("s3"), Set.of("s1-1")));
		assertEquals(Optional.of("s3-2"), QuickCheckRules.startLesson(story("s3"), Set.of("s3-1")));
		assertEquals(Optional.empty(), QuickCheckRules.startLesson(story("s3"), done("s3")));
	}

	@Test
	void aStartLessonWithoutQuestionsTakesTheAreaOfTheStorysFirstBankLesson() {
		assertEquals(INVESTING, QuickCheckRules.area(story("s2"), "s2-1", LESSONS));
		assertEquals(SAVING, QuickCheckRules.area(story("s3"), "s3-2", LESSONS));
		assertNull(QuickCheckRules.area(story("s9"), "s9-1", LESSONS));
	}

	@Test
	void unansweredAreasRankAfterAnsweredOnesAndGiveTheirLowestLesson() {
		StoryPlan answeredInvesting = plan(Set.of(), right(I_EASY, Confidence.SURE));
		assertEquals("s2", answeredInvesting.start().id());
		assertEquals(List.of("s2", "s4", "s1", "s3"), answeredInvesting.pathStoryIds());

		StoryPlan none = plan(Set.of());
		assertEquals("s1", none.start().id());
		assertEquals(List.of("s1", "s3", "s2", "s4"), none.pathStoryIds());
	}

	@Test
	void aSolidAreaHasNoCandidatesButOneStrongAnswerIsOnlyBuilding() {
		StoryPlan oneAnswer = plan(Set.of(), right(S_EASY_1, Confidence.SURE));
		assertEquals("s1", oneAnswer.start().id());

		StoryPlan solidSaving = plan(Set.of(), right(S_EASY_1, Confidence.SURE), right(S_EASY_2, Confidence.SURE));
		assertEquals(List.of("s2", "s4"), solidSaving.pathStoryIds());
	}

	@Test
	void withEveryAreaSolidTheFirstStoryWithALessonLeftIsReadyForNext() {
		Answer[] allSure = { right(S_EASY_1, Confidence.SURE), right(S_EASY_2, Confidence.SURE),
				right(I_EASY, Confidence.SURE), right(SHORT_FALL, Confidence.SURE) };

		StoryPlan plan = plan(Set.of(), allSure);
		assertEquals("s1", plan.start().id());
		assertTrue(plan.readyForNext());
		assertEquals(List.of("s1"), plan.pathStoryIds());

		assertEquals("s2", plan(done("s1"), allSure).start().id());
		StoryPlan nothingLeft = plan(done("s1", "s2", "s3", "s4"), allSure);
		assertNull(nothingLeft.start());
		assertEquals(List.of(), nothingLeft.pathStoryIds());
	}

	@Test
	void anAreaLeftWithOnlyDoneStoriesIsNotReadyForNext() {
		StoryPlan plan = plan(done("s2", "s4"), right(S_EASY_1, Confidence.SURE), right(S_EASY_2, Confidence.SURE),
				notSure(I_EASY));

		assertEquals("s1", plan.start().id());
		assertFalse(plan.readyForNext());
	}

	@Test
	void onlyAreasWithAChipCanHaveAGap() {
		assertEquals(List.of(INVESTING), QuickCheckRules.chipAreas(ORDER,
				List.of(notSure(S_EASY_1), right(I_EASY, Confidence.SURE))));
	}

}
