package com.collabothon.back.categorization.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.ArrayList;
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
import com.collabothon.back.categorization.enums.Role;
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

	private static CheckQuestionProjection withSlots(String id, QuestionLevel level, String... slots) {
		return new CheckQuestionProjection(id, "s1-1", SAVING, level, "Account prompt " + id, List.of(slots),
				"Prompt " + id, List.of("a", "b", "c"), 0, Arrays.asList(null, "m1-" + id, "m2-" + id), "Checks " + id);
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
	void aRightAnswerScoresTheSameWhateverTheConfidenceAndAnAreaIsTheMean() {
		for (Confidence confidence : Confidence.values()) {
			assertEquals(0.85, mastery(right(S_EASY_1, confidence)).get(SAVING), EPSILON);
		}
		// With one self-rating on every answer, a low rating must still be able to reach Solid.
		List<Answer> guessedRight = List.of(right(S_EASY_1, Confidence.GUESSING), right(S_EASY_2, Confidence.GUESSING));
		assertTrue(QuickCheckRules.solid(SAVING, QuickCheckRules.mastery(ORDER, guessedRight), guessedRight));
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
	void amongEasyQuestionsTheOneQuotingMoreOfTheUsersNumbersComesFirstThenTheId() {
		CheckQuestionProjection oneSlot = withSlots("a-one-slot", QuestionLevel.EASY, "monthOut");
		CheckQuestionProjection twoSlots = withSlots("b-two-slots", QuestionLevel.EASY, "savingsBalance", "savingsInterestRate");
		CheckQuestionProjection alsoTwo = withSlots("c-two-slots", QuestionLevel.EASY, "savingsBalance", "monthOut");
		CheckQuestionProjection hardThree = withSlots("d-hard", QuestionLevel.HARD, "savingsBalance", "monthOut", "depotTotal");
		List<CheckQuestionProjection> bank = List.of(oneSlot, alsoTwo, hardThree, twoSlots);

		List<String> asked = new ArrayList<>();
		List<Answer> answers = new ArrayList<>();
		for (int i = 0; i < bank.size(); i++) {
			CheckQuestionProjection next = QuickCheckRules.next(List.of(SAVING), bank, answers, null).orElseThrow();
			asked.add(next.id());
			answers.add(right(next, Confidence.SURE));
		}
		assertEquals(List.of("b-two-slots", "c-two-slots", "a-one-slot", "d-hard"), asked);
	}

	@Test
	void theShortHorizonSwapWinsOverTheSlotOrder() {
		CheckQuestionProjection twoSlots = withSlots("two-slots", QuestionLevel.EASY, "savingsBalance", "savingsInterestRate");
		CheckQuestionProjection fall = q(CategorizationConsts.SHORT_HORIZON_QUESTION_ID, "s1-1", SAVING, QuestionLevel.EASY);
		List<CheckQuestionProjection> bank = List.of(twoSlots, fall);

		assertEquals("two-slots", QuickCheckRules.next(List.of(SAVING), bank, List.of(), "1-5y").orElseThrow().id());
		assertEquals(fall.id(),
				QuickCheckRules.next(List.of(SAVING), bank, List.of(), CategorizationConsts.HORIZON_WITHIN_1Y).orElseThrow().id());
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
		// Saving 0.85, investing 0.25: investing is weaker, its next easy question comes before the hard one.
		assertEquals(Optional.of(SHORT_FALL.id()),
				next(null, wrong(I_EASY, Confidence.GUESSING), right(S_EASY_1, Confidence.SURE)));
		assertEquals(Optional.of("i-hard"), next(null, wrong(I_EASY, Confidence.GUESSING),
				notSure(SHORT_FALL), right(S_EASY_1, Confidence.SURE)));
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
		List<Answer> covering = List.of(right(S_EASY_1, Confidence.SURE), notSure(S_EASY_2),
				right(I_EASY, Confidence.SURE));
		assertTrue(QuickCheckRules.ruleDone(ORDER, QuickCheckRules.unasked(BANK, covering), covering));
		List<Answer> four = List.of(right(S_EASY_1, Confidence.SURE), right(S_EASY_2, Confidence.SURE),
				right(S_HARD, Confidence.SURE), notSure(I_EASY));
		assertTrue(QuickCheckRules.ruleDone(ORDER, QuickCheckRules.unasked(BANK, four), four));
		List<Answer> one = List.of(right(S_EASY_1, Confidence.SURE));
		assertTrue(QuickCheckRules.ruleDone(ORDER, List.of(), one));
	}

	@Test
	void aRunWithoutAMistakeGoesOnWhileAnAreaIsOneAnswerShortOfSolid() {
		List<Answer> allRight = List.of(right(S_EASY_1, Confidence.SURE), right(I_EASY, Confidence.SURE),
				right(S_EASY_2, Confidence.SURE));
		assertFalse(QuickCheckRules.ruleDone(ORDER, QuickCheckRules.unasked(BANK, allRight), allRight));
		// Saving and investing tie at 0.85; the second investing question goes before a third saving one.
		assertEquals(Optional.of(SHORT_FALL.id()), next(null, allRight.toArray(Answer[]::new)));
		assertTrue(QuickCheckRules.ruleDone(ORDER, List.of(S_HARD), allRight));
		List<Answer> oneWrong = List.of(wrong(S_EASY_1, Confidence.SURE), right(S_EASY_2, Confidence.SURE),
				right(I_EASY, Confidence.SURE));
		assertTrue(QuickCheckRules.ruleDone(ORDER, QuickCheckRules.unasked(BANK, oneWrong), oneWrong));
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
	void underNeedsEveryAnswerInTheAreaRightAndALowSelfRating() {
		assertEquals(Map.of(SAVING, GapDirection.UNDER), ruleGaps(List.of(right(S_EASY_1, Confidence.GUESSING))));
		assertEquals(Map.of(SAVING, GapDirection.UNDER),
				ruleGaps(List.of(right(S_EASY_1, Confidence.GUESSING), right(S_EASY_2, Confidence.GUESSING))));
		assertEquals(Map.of(), ruleGaps(List.of(right(S_EASY_1, Confidence.SURE))));
		// A self-rating of 3 out of 5 is not low.
		assertEquals(Map.of(),
				ruleGaps(List.of(right(S_EASY_1, Confidence.FAIRLY_SURE), right(S_EASY_2, Confidence.FAIRLY_SURE))));
		assertEquals(Map.of(),
				ruleGaps(List.of(wrong(S_EASY_1, Confidence.GUESSING), right(S_EASY_2, Confidence.GUESSING))));
		assertEquals(Map.of(), ruleGaps(List.of(right(S_EASY_1, Confidence.GUESSING), notSure(S_EASY_2))));
		assertFalse(QuickCheckRules.underHolds(List.of()));
	}

	@Test
	void withoutADeclaredExperienceTheRoleFollowsHowManyAnsweredAreasAreSolid() {
		List<Answer> bothSolid = List.of(right(S_EASY_1, Confidence.GUESSING), right(S_EASY_2, Confidence.GUESSING),
				right(I_EASY, Confidence.GUESSING), right(SHORT_FALL, Confidence.GUESSING));
		assertEquals(Role.ADVANCED, QuickCheckRules.measuredRole(QuickCheckRules.mastery(ORDER, bothSolid), bothSolid));
		// An area nobody asked about does not hold the role back.
		List<Answer> savingOnly = bothSolid.subList(0, 2);
		assertEquals(Role.ADVANCED, QuickCheckRules.measuredRole(QuickCheckRules.mastery(ORDER, savingOnly), savingOnly));
		// One right answer in investing is Building, not Solid.
		List<Answer> oneSolid = bothSolid.subList(0, 3);
		assertEquals(Role.INTERMEDIATE, QuickCheckRules.measuredRole(QuickCheckRules.mastery(ORDER, oneSolid), oneSolid));
		List<Answer> noneSolid = List.of(right(S_EASY_1, Confidence.SURE), wrong(S_EASY_2, Confidence.SURE),
				right(I_EASY, Confidence.SURE));
		assertEquals(Role.NOVICE, QuickCheckRules.measuredRole(QuickCheckRules.mastery(ORDER, noneSolid), noneSolid));
	}

	@Test
	void aJevLabelWithoutItsPreconditionReadsAsAligned() {
		List<Answer> sureAndRight = List.of(right(S_EASY_1, Confidence.SURE));
		assertEquals(Optional.empty(), QuickCheckRules.checkedJevGap(GapDirection.UNDER, sureAndRight, 0.85));
		assertEquals(Optional.empty(), QuickCheckRules.checkedJevGap(GapDirection.OVER, sureAndRight, 0.85));
		assertEquals(Optional.empty(), QuickCheckRules.checkedJevGap(GapDirection.ALIGNED, sureAndRight, 0.85));
		List<Answer> guessedRight = List.of(right(S_EASY_1, Confidence.GUESSING));
		assertEquals(Optional.of(GapDirection.UNDER),
				QuickCheckRules.checkedJevGap(GapDirection.UNDER, guessedRight, 0.4));
		assertEquals(Optional.empty(), QuickCheckRules.checkedJevGap(GapDirection.UNDER, guessedRight, 0.25));
	}

	@Test
	void gapCardsPutUnderFirstAndNameTheFirstLesson() {
		Map<FocusArea, GapDirection> gaps = new LinkedHashMap<>();
		gaps.put(SAVING, GapDirection.OVER);
		gaps.put(INVESTING, GapDirection.UNDER);

		assertEquals(List.of(
				new ConfidenceGapDto(INVESTING, GapDirection.UNDER,
						"You rated your confidence low, yet your Investing answers show you already understand how it works."),
				new ConfidenceGapDto(SAVING, GapDirection.OVER,
						"You rated your confidence high. Your Saving answers leave a few things open, which is"
								+ " where your first lesson starts.")),
				QuickCheckRules.gapCards(gaps, SAVING));
		assertEquals("You rated your confidence high. Your Saving answers leave a few things open to explore.",
				QuickCheckRules.gapCards(Map.of(SAVING, GapDirection.OVER), INVESTING).getFirst().because());
	}

	@Test
	void atMostTwoGapCards() {
		Map<FocusArea, GapDirection> gaps = new LinkedHashMap<>();
		gaps.put(SAVING, GapDirection.UNDER);
		gaps.put(INVESTING, GapDirection.UNDER);
		gaps.put(FocusArea.RISK, GapDirection.UNDER);

		assertEquals(List.of(SAVING, INVESTING),
				QuickCheckRules.gapCards(gaps, null).stream().map(ConfidenceGapDto::area).toList());
	}

	@Test
	void theWeakestAreasLowestScoredAnswerGivesTheFirstStory() {
		// Saving 0.55 (s1 at 0.85, s3 at 0.25) is weaker than investing 0.85.
		StoryPlan plan = plan(Set.of(), right(S_EASY_1, Confidence.SURE), notSure(S_EASY_2),
				right(I_EASY, Confidence.SURE));

		assertEquals("s3", plan.start().id());
		assertEquals(SAVING, plan.area());
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
	void aLaterPathStoryReadBackTakesItsWeakestStoredArea() {
		Story mixed = new Story("mix", "City", "Topic", List.of("s1-1", "s2-1"));

		assertEquals(INVESTING, QuickCheckRules.storedPickingArea(mixed, LESSONS, Map.of("saving", 0.6, "investing", 0.3)));
		Map<String, Double> savingUnanswered = new LinkedHashMap<>();
		savingUnanswered.put("saving", null);
		savingUnanswered.put("investing", 0.6);
		assertEquals(INVESTING, QuickCheckRules.storedPickingArea(mixed, LESSONS, savingUnanswered));
		assertEquals(SAVING, QuickCheckRules.storedPickingArea(mixed, LESSONS, Map.of()));
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
		assertNull(plan.area());
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
