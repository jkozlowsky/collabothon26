package com.collabothon.back.categorization.services;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
import java.util.random.RandomGenerator;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.dto.FactsDto;
import com.collabothon.back.categorization.dto.GapDto;
import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.GapDirection;
import com.collabothon.back.categorization.enums.Role;
import com.collabothon.back.categorization.mappers.CheckLessonMapper;

class QuickCheckRulesTests {

	private static final double EPSILON = 1e-9;

	private static final FocusArea SAVING = FocusArea.SAVING;

	private static final FocusArea INVESTING = FocusArea.INVESTING;

	// Story sN holds lessons sN-1 and sN-2. s1 and s3 are saving, s2 and s4 investing. s1-1 and s2-1 have two quiz
	// steps, s1-2, s2-2, s3-1 and s4-1 one, s3-2 and s4-2 none. The pool is in story order, like the real one.
	private static final CheckQuestion S11_A = q("s1-1", "q1", SAVING);

	private static final CheckQuestion S11_B = q("s1-1", "q2", SAVING);

	private static final CheckQuestion S12 = q("s1-2", "q1", SAVING);

	private static final CheckQuestion I21_A = q("s2-1", "q1", INVESTING);

	private static final CheckQuestion I21_B = q("s2-1", "q2", INVESTING);

	private static final CheckQuestion I22 = q("s2-2", "q1", INVESTING);

	private static final CheckQuestion S31 = q("s3-1", "q1", SAVING);

	private static final CheckQuestion I41 = q("s4-1", "q1", INVESTING);

	private static final List<CheckQuestion> POOL = List.of(S11_A, S11_B, S12, I21_A, I21_B, I22, S31, I41);

	private static final List<FocusArea> ORDER = List.of(SAVING, INVESTING);

	private static final List<CheckLesson> LESSONS = QuickCheckRules.lessons(POOL,
			Mappers.getMapper(CheckLessonMapper.class)::toLesson);

	private static final List<Story> STORIES = List.of(story("s1"), story("s2"), story("s3"), story("s4"));

	private static Story story(String id) {
		return new Story(id, "City " + id, "Topic " + id, List.of(id + "-1", id + "-2"));
	}

	private static Set<String> done(String... storyIds) {
		return Arrays.stream(storyIds).flatMap(id -> story(id).lessonIds().stream()).collect(Collectors.toSet());
	}

	/** Option 0 is correct. */
	private static CheckQuestion q(String lessonId, String stepId, FocusArea area) {
		return new CheckQuestion(lessonId + "/" + stepId, lessonId, lessonId.substring(0, 2), area,
				"Topic " + lessonId, List.of("concept-" + lessonId), "Prompt " + stepId, List.of("a", "b", "c"), 0,
				"Because " + stepId);
	}

	private static CheckLesson lesson(String id) {
		return LESSONS.stream().filter(l -> l.id().equals(id)).findFirst().orElseThrow();
	}

	private static Answer right(CheckQuestion q) {
		return new Answer(q, 0);
	}

	private static Answer wrong(CheckQuestion q) {
		return new Answer(q, 1);
	}

	private static Answer notSure(CheckQuestion q) {
		return new Answer(q, null);
	}

	/** Account facts with the two habits a gap reads; the bands are irrelevant to it. */
	private static FactsDto facts(boolean savesRegularly, boolean holdsInvestments) {
		return new FactsDto("2-3.5k", "6+", "20%+", savesRegularly, false, holdsInvestments, false);
	}

	private static List<CheckQuestion> open(Answer... answers) {
		return QuickCheckRules.open(POOL, List.of(answers), Set.of());
	}

	private static Optional<String> nextLesson(Answer... answers) {
		return QuickCheckRules.nextLesson(ORDER, POOL, open(answers), List.of(answers));
	}

	private static RandomGenerator always(int index) {
		return new RandomGenerator() {
			@Override
			public long nextLong() {
				return 0;
			}

			@Override
			public int nextInt(int bound) {
				return index % bound;
			}
		};
	}

	private static List<String> ids(List<CheckLesson> lessons) {
		return lessons.stream().map(CheckLesson::id).toList();
	}

	private static Map<FocusArea, Double> mastery(Answer... answers) {
		return QuickCheckRules.mastery(ORDER, List.of(answers));
	}

	private static List<CheckLesson> candidates(Set<String> completed, Answer... answers) {
		List<Answer> list = List.of(answers);
		return QuickCheckRules.candidates(LESSONS, STORIES, ORDER, QuickCheckRules.mastery(ORDER, list), list, completed);
	}

	private static StoryPlan plan(Set<String> completed, CheckLesson picked, Answer... answers) {
		List<Answer> list = List.of(answers);
		return QuickCheckRules.plan(STORIES, candidates(completed, answers), picked, ORDER,
				QuickCheckRules.mastery(ORDER, list), list, completed);
	}

	private static StoryPlan plan(Set<String> completed, Answer... answers) {
		return plan(completed, null, answers);
	}

	private static Map<FocusArea, GapDirection> ruleGaps(FactsDto facts, Answer... answers) {
		Map<FocusArea, GapDirection> gaps = new LinkedHashMap<>();
		for (FocusArea area : ORDER) {
			QuickCheckRules.ruleGap(area, QuickCheckRules.inArea(List.of(answers), area), facts)
				.ifPresent(direction -> gaps.put(area, direction));
		}
		return gaps;
	}

	@Test
	void aRightAnswerScoresHighAWrongOrNotSureOneLowAndAnAreaIsTheMean() {
		assertEquals(0.85, mastery(right(S11_A)).get(SAVING), EPSILON);
		List<Answer> twoRight = List.of(right(S11_A), right(S31));
		assertTrue(QuickCheckRules.solid(SAVING, QuickCheckRules.mastery(ORDER, twoRight), twoRight));
		assertEquals(0.25, mastery(wrong(S11_A)).get(SAVING), EPSILON);
		assertEquals(0.25, mastery(notSure(S11_A)).get(SAVING), EPSILON);
		Map<FocusArea, Double> mixed = mastery(right(S11_A), wrong(S31));
		assertEquals(0.55, mixed.get(SAVING), EPSILON);
		assertTrue(mixed.containsKey(INVESTING));
		assertNull(mixed.get(INVESTING));
	}

	@Test
	void goalAreasComeFirstThenTheFixedOrderKeepingOnlyAreasWithQuestions() {
		assertEquals(List.of(SAVING, INVESTING), QuickCheckRules.areaOrder(List.of(), null, POOL));
		assertEquals(List.of(INVESTING, SAVING), QuickCheckRules.areaOrder(List.of("stocks-etfs"), "5y+", POOL));
		assertEquals(List.of(SAVING, INVESTING),
				QuickCheckRules.areaOrder(List.of("stocks-etfs"), CategorizationConsts.HORIZON_WITHIN_1Y, POOL));
		assertEquals(List.of(INVESTING), QuickCheckRules.areaOrder(List.of("retirement"), null, List.of(I21_A)));
	}

	@Test
	void theLessonsAreTheQuestionsLessonsEachOnceInStoryOrder() {
		assertEquals(List.of("s1-1", "s1-2", "s2-1", "s2-2", "s3-1", "s4-1"), ids(LESSONS));
		assertEquals(new CheckLesson("s1-1", "s1", SAVING, "Topic s1-1", List.of("concept-s1-1")), LESSONS.getFirst());
		assertEquals("the_interest_in_no_interest",
				new CheckLesson("x", "s", SAVING, "The interest in \"no interest\"", List.of()).label());
	}

	@Test
	void anEmptyHistoryStartsInTheFirstAreasFirstLesson() {
		assertEquals(Optional.of("s1-1"), nextLesson());
		assertEquals(Optional.of("s2-1"), QuickCheckRules.nextLesson(List.of(INVESTING, SAVING), POOL, POOL, List.of()));
	}

	@Test
	void aWrongOrNotSureAnswerStaysInTheLessonThenMovesToTheStorysNextLesson() {
		assertEquals(Optional.of("s1-1"), nextLesson(wrong(S11_A)));
		assertEquals(Optional.of("s1-1"), nextLesson(notSure(S11_B)));
		assertEquals(Optional.of("s1-2"), nextLesson(wrong(S11_A), notSure(S11_B)));
		// A lesson earlier in the story is not gone back to.
		assertEquals(Optional.of("s2-1"), nextLesson(wrong(S12)));
	}

	@Test
	void withNothingLeftInTheStoryAWrongAnswerMovesToTheNextRule() {
		assertEquals(Optional.of("s2-1"), nextLesson(wrong(S11_A), wrong(S11_B), wrong(S12)));
		// s3 has no later lesson with a quiz; every area has an answer, so the weakest one (saving) goes on.
		assertEquals(Optional.of("s1-1"), nextLesson(right(I21_A), wrong(S31)));
	}

	@Test
	void aCorrectAnswerMovesToTheFirstAreaWithoutAnAnswer() {
		assertEquals(Optional.of("s2-1"), nextLesson(right(S11_A)));
	}

	@Test
	void withEveryAreaAnsweredTheWeakestAreaGoesNextWithALessonNotAskedAboutFirst() {
		// Saving 0.85, investing 0.25: investing goes on, with s2-2 before the second question of s2-1.
		assertEquals(Optional.of("s2-2"), nextLesson(wrong(I21_A), right(S11_A)));
		assertEquals(Optional.of("s2-1"), nextLesson(notSure(I21_A), notSure(I22), notSure(I41), right(S11_A)));
	}

	@Test
	void aMasteryTieGoesToTheAreaOrderAndAnExhaustedAreaToTheNext() {
		// Both areas at 0.55.
		assertEquals(Optional.of("s1-2"), nextLesson(wrong(S11_A), right(S11_B), wrong(I21_A), right(I21_B)));
		// Saving is weakest (0.25) but all its questions are asked, so investing comes next.
		assertEquals(Optional.of("s2-2"),
				nextLesson(right(I21_A), notSure(S11_A), notSure(S11_B), notSure(S12), notSure(S31)));
	}

	@Test
	void aCompletedLessonHasNoOpenQuestion() {
		List<CheckQuestion> open = QuickCheckRules.open(POOL, List.of(right(I21_A)), Set.of("s1-1", "s2-2"));

		assertEquals(List.of(S12, I21_B, S31, I41), open);
		assertEquals(Optional.of("s1-2"), QuickCheckRules.nextLesson(ORDER, POOL, open, List.of(right(I21_A))));
	}

	@Test
	void theDrawTakesAnyOpenQuestionOfTheLessonAndNeverAnAskedOne() {
		assertEquals(S11_A, QuickCheckRules.draw(open(), "s1-1", always(0)));
		assertEquals(S11_B, QuickCheckRules.draw(open(), "s1-1", always(1)));
		assertEquals(S11_A, QuickCheckRules.draw(open(wrong(S11_B)), "s1-1", always(1)));
		Random random = new Random(7);
		Set<CheckQuestion> drawn = new HashSet<>();
		for (int i = 0; i < 50; i++) {
			drawn.add(QuickCheckRules.draw(open(right(I21_A)), "s1-1", random));
		}
		assertEquals(Set.of(S11_A, S11_B), drawn);
	}

	@Test
	void jevChoosesAmongTwoLessonsPerAreaOneOfEachStoryFirst() {
		assertEquals(List.of("s1-1", "s3-1", "s2-1", "s4-1"), ids(QuickCheckRules.nextLessonChoices(ORDER, LESSONS)));
		List<CheckLesson> open = QuickCheckRules.lessons(open(right(S11_A), right(S11_B), right(S31)),
				Mappers.getMapper(CheckLessonMapper.class)::toLesson);
		assertEquals(List.of("s2-1", "s4-1", "s1-2"),
				ids(QuickCheckRules.nextLessonChoices(List.of(INVESTING, SAVING), open)));
	}

	@Test
	void theRuleStopsAtFourAnswersOrAtThreeCoveringEveryArea() {
		Answer[] three = { right(S11_A), right(S11_B), right(S12) };
		assertFalse(QuickCheckRules.ruleDone(ORDER, open(three), List.of(three)));
		// An area with no question left to ask counts as covered.
		assertTrue(QuickCheckRules.ruleDone(ORDER, List.of(S31), List.of(three)));
		Answer[] covering = { right(S11_A), notSure(S11_B), right(I21_A) };
		assertTrue(QuickCheckRules.ruleDone(ORDER, open(covering), List.of(covering)));
		Answer[] four = { right(S11_A), right(S11_B), right(S12), notSure(I21_A) };
		assertTrue(QuickCheckRules.ruleDone(ORDER, open(four), List.of(four)));
		assertTrue(QuickCheckRules.ruleDone(ORDER, List.of(), List.of(right(S11_A))));
	}

	@Test
	void aRunWithoutAMistakeGoesOnWhileAnAreaIsOneAnswerShortOfSolid() {
		Answer[] allRight = { right(S11_A), right(I21_A), right(S12) };
		assertFalse(QuickCheckRules.ruleDone(ORDER, open(allRight), List.of(allRight)));
		// Saving and investing tie at 0.85; the second investing question goes before a third saving one.
		assertEquals(Optional.of("s2-2"), nextLesson(allRight));
		assertTrue(QuickCheckRules.ruleDone(ORDER, List.of(S31), List.of(allRight)));
		Answer[] oneWrong = { wrong(S11_A), right(S11_B), right(I21_A) };
		assertTrue(QuickCheckRules.ruleDone(ORDER, open(oneWrong), List.of(oneWrong)));
	}

	@Test
	void aRunWithoutAMistakeMayGoOnToSixAnswersAndOneWithAMistakeEndsAtFour() {
		Answer[] fourRight = { right(S11_A), right(S11_B), right(S12), right(S31) };
		assertFalse(QuickCheckRules.ruleDone(ORDER, open(fourRight), List.of(fourRight)));
		assertEquals(Optional.of("s2-1"), nextLesson(fourRight));
		Answer[] fourWithAMistake = { right(S11_A), right(S11_B), right(S12), notSure(S31) };
		assertTrue(QuickCheckRules.ruleDone(ORDER, open(fourWithAMistake), List.of(fourWithAMistake)));
		// Six right answers end the run even with investing still one answer short of Solid.
		CheckQuestion debt = q("s5-1", "q1", FocusArea.DEBT);
		List<FocusArea> threeAreas = List.of(SAVING, FocusArea.DEBT, INVESTING);
		List<Answer> five = List.of(right(S11_A), right(S11_B), right(S12), right(S31), right(debt));
		List<Answer> six = List.of(right(S11_A), right(S11_B), right(S12), right(S31), right(debt), right(I21_A));
		assertFalse(QuickCheckRules.ruleDone(threeAreas, List.of(I21_A, I21_B), five));
		assertTrue(QuickCheckRules.ruleDone(threeAreas, List.of(I21_B), six));
	}

	@Test
	void jevStopsAtSixAtNoQuestionLeftOrWhenEnoughAfterThree() {
		Answer[] two = { notSure(S11_A), notSure(S11_B) };
		assertFalse(QuickCheckRules.jevDone(open(two), List.of(two), 0.99));
		Answer[] three = { notSure(S11_A), notSure(S11_B), notSure(S12) };
		assertFalse(QuickCheckRules.jevDone(open(three), List.of(three), 0.69));
		assertTrue(QuickCheckRules.jevDone(open(three), List.of(three), 0.7));
		List<Answer> six = POOL.stream().limit(6).map(QuickCheckRulesTests::notSure).toList();
		assertTrue(QuickCheckRules.jevDone(List.of(S31, I41), six, 0));
		assertTrue(QuickCheckRules.jevDone(List.of(), List.of(three), 0));
	}

	@Test
	void aHabitWithAnAnswerNotRightIsHabitAhead() {
		FactsDto bothHabits = facts(true, true);
		assertEquals(Map.of(SAVING, GapDirection.HABIT_AHEAD), ruleGaps(bothHabits, right(S11_A), wrong(S31)));
		assertEquals(Map.of(SAVING, GapDirection.HABIT_AHEAD), ruleGaps(bothHabits, notSure(S11_A), right(I21_A)));
		assertEquals(Map.of(INVESTING, GapDirection.HABIT_AHEAD), ruleGaps(bothHabits, right(S11_A), wrong(I21_A)));
		// A habit with every answer right is aligned.
		assertEquals(Map.of(), ruleGaps(bothHabits, right(S11_A), right(S31), right(I21_A)));
	}

	@Test
	void noHabitWithEveryAnswerRightIsKnowledgeAhead() {
		FactsDto noHabits = facts(false, false);
		assertEquals(Map.of(SAVING, GapDirection.KNOWLEDGE_AHEAD), ruleGaps(noHabits, right(S11_A), right(S31)));
		assertEquals(Map.of(INVESTING, GapDirection.KNOWLEDGE_AHEAD), ruleGaps(noHabits, wrong(S11_A), right(I21_A)));
		// No habit with an answer not right is aligned.
		assertEquals(Map.of(), ruleGaps(noHabits, right(S11_A), notSure(S31), wrong(I21_A)));
		// Each area reads its own habit.
		assertEquals(Map.of(SAVING, GapDirection.HABIT_AHEAD, INVESTING, GapDirection.KNOWLEDGE_AHEAD),
				ruleGaps(facts(true, false), wrong(S11_A), right(I21_A)));
	}

	@Test
	void withoutFactsOrWithoutAnAnswerInTheAreaThereIsNoGap() {
		assertEquals(Map.of(), ruleGaps(null, wrong(S11_A), right(I21_A)));
		assertEquals(Map.of(), ruleGaps(facts(true, false)));
		assertEquals(Optional.empty(), QuickCheckRules.ruleGap(SAVING, List.of(), facts(false, false)));
	}

	@Test
	void withoutADeclaredExperienceTheRoleFollowsTheStrongAndTheSolidAreas() {
		List<Answer> bothSolid = List.of(right(S11_A), right(S31),
				right(I21_A), right(I41));
		assertEquals(Role.ADVANCED, QuickCheckRules.measuredRole(QuickCheckRules.mastery(ORDER, bothSolid), bothSolid));
		// An area nobody asked about does not hold the role back.
		List<Answer> savingOnly = bothSolid.subList(0, 2);
		assertEquals(Role.ADVANCED, QuickCheckRules.measuredRole(QuickCheckRules.mastery(ORDER, savingOnly), savingOnly));
		// One right answer in investing is Building, not Solid.
		List<Answer> oneSolid = bothSolid.subList(0, 3);
		assertEquals(Role.INTERMEDIATE, QuickCheckRules.measuredRole(QuickCheckRules.mastery(ORDER, oneSolid), oneSolid));
		// Investing reads high on the map (0.85) with its single answer: enough for intermediate, though nothing is Solid.
		List<Answer> oneStrong = List.of(wrong(S11_A), right(S31),
				right(I21_A));
		assertEquals(Role.INTERMEDIATE, QuickCheckRules.measuredRole(QuickCheckRules.mastery(ORDER, oneStrong), oneStrong));
		List<Answer> noneStrong = List.of(right(S11_A), wrong(S31),
				wrong(I21_A));
		assertEquals(Role.NOVICE, QuickCheckRules.measuredRole(QuickCheckRules.mastery(ORDER, noneStrong), noneStrong));
		List<Answer> nothingRight = List.of(wrong(S11_A), notSure(S31), notSure(I21_A));
		assertEquals(Role.NOVICE,
				QuickCheckRules.measuredRole(QuickCheckRules.mastery(ORDER, nothingRight), nothingRight));
		assertEquals(Role.NOVICE, QuickCheckRules.measuredRole(QuickCheckRules.mastery(ORDER, List.of()), List.of()));
	}

	@Test
	void aJevLabelThatTheRuleDoesNotBackReadsAsAligned() {
		List<Answer> oneWrong = List.of(wrong(S11_A));
		FactsDto saves = facts(true, false);
		assertEquals(Optional.of(GapDirection.HABIT_AHEAD),
				QuickCheckRules.checkedJevGap(GapDirection.HABIT_AHEAD, SAVING, oneWrong, saves));
		assertEquals(Optional.empty(),
				QuickCheckRules.checkedJevGap(GapDirection.KNOWLEDGE_AHEAD, SAVING, oneWrong, saves));
		assertEquals(Optional.empty(), QuickCheckRules.checkedJevGap(GapDirection.ALIGNED, SAVING, oneWrong, saves));
		assertEquals(Optional.empty(),
				QuickCheckRules.checkedJevGap(GapDirection.HABIT_AHEAD, SAVING, oneWrong, facts(false, false)));
		assertEquals(Optional.empty(), QuickCheckRules.checkedJevGap(GapDirection.HABIT_AHEAD, SAVING, oneWrong, null));
	}

	@Test
	void gapCardsPutTheStartLessonsAreaFirstAndSayWhatTheAccountShows() {
		Map<FocusArea, GapDirection> gaps = new LinkedHashMap<>();
		gaps.put(SAVING, GapDirection.KNOWLEDGE_AHEAD);
		gaps.put(INVESTING, GapDirection.HABIT_AHEAD);

		assertEquals(List.of(
				new GapDto(INVESTING, GapDirection.HABIT_AHEAD,
						"Your account shows you already invest. Your Investing answers leave a few things open, which is"
								+ " where your first lesson starts."),
				new GapDto(SAVING, GapDirection.KNOWLEDGE_AHEAD,
						"Your Saving answers show you understand how it works. Your account shows no monthly transfer to"
								+ " savings.")),
				QuickCheckRules.gapCards(gaps, INVESTING));
		assertEquals("Your account shows you move money to savings every month. Your Saving answers leave a few things"
				+ " open, which is where your first lesson starts.",
				QuickCheckRules.gapCards(Map.of(SAVING, GapDirection.HABIT_AHEAD), SAVING).getFirst().because());
		assertEquals("Your account shows you move money to savings every month. Your Saving answers leave a few things"
				+ " open to explore.",
				QuickCheckRules.gapCards(Map.of(SAVING, GapDirection.HABIT_AHEAD), INVESTING).getFirst().because());
		assertEquals("Your Investing answers show you understand how it works. Your account shows no investment products.",
				QuickCheckRules.gapCards(Map.of(INVESTING, GapDirection.KNOWLEDGE_AHEAD), SAVING).getFirst().because());
	}

	@Test
	void atMostTwoGapCards() {
		Map<FocusArea, GapDirection> gaps = new LinkedHashMap<>();
		gaps.put(SAVING, GapDirection.HABIT_AHEAD);
		gaps.put(INVESTING, GapDirection.HABIT_AHEAD);
		gaps.put(FocusArea.RISK, GapDirection.HABIT_AHEAD);

		assertEquals(List.of(SAVING, INVESTING),
				QuickCheckRules.gapCards(gaps, null).stream().map(GapDto::area).toList());
	}

	@Test
	void theWeakestAreasLowestScoredAnswerGivesTheFirstStory() {
		// Saving 0.55 (s1-1 at 0.85, s3-1 at 0.25) is weaker than investing 0.85.
		StoryPlan plan = plan(Set.of(), right(S11_A), notSure(S31), right(I21_A));

		assertEquals("s3", plan.start().id());
		assertEquals(SAVING, plan.area());
		assertFalse(plan.readyForNext());
		// Then the rest of saving, then investing; unanswered areas would follow.
		assertEquals(List.of("s3", "s1", "s2", "s4"), plan.pathStoryIds());
	}

	@Test
	void aTieInScoreGoesToTheEarlierAnswer() {
		assertEquals("s3", plan(Set.of(), notSure(S31), notSure(S11_A)).start().id());
		assertEquals("s1", plan(Set.of(), notSure(S11_A), notSure(S31)).start().id());
	}

	@Test
	void aPickedLessonGivesItsStoryAndAreaInsteadOfTheRules() {
		StoryPlan plan = plan(Set.of(), lesson("s4-1"), right(S11_A), notSure(S31), right(I21_A));

		assertEquals("s4", plan.start().id());
		assertEquals(INVESTING, plan.area());
		assertEquals(List.of("s4", "s1", "s3", "s2"), plan.pathStoryIds());
	}

	@Test
	void aStoryWithEveryLessonDoneIsSkippedButOneWithALessonLeftStays() {
		Answer[] answers = { right(S11_A), notSure(S31), right(I21_A) };

		StoryPlan allDone = plan(done("s3"), answers);
		assertEquals("s1", allDone.start().id());
		assertEquals(List.of("s1", "s2", "s4"), allDone.pathStoryIds());

		StoryPlan quizLessonDone = plan(Set.of("s3-1"), answers);
		assertEquals("s3", quizLessonDone.start().id());
	}

	@Test
	void theStartLessonIsTheStorysFirstLessonNotDone() {
		assertEquals(Optional.of("s3-1"), QuickCheckRules.startLesson(story("s3"), Set.of("s1-1")));
		assertEquals(Optional.of("s3-2"), QuickCheckRules.startLesson(story("s3"), Set.of("s3-1")));
		assertEquals(Optional.empty(), QuickCheckRules.startLesson(story("s3"), done("s3")));
	}

	@Test
	void aStorysAreaIsItsLessonsAreaAndNullWithoutAQuiz() {
		assertEquals(INVESTING, QuickCheckRules.areaOf(story("s4"), LESSONS));
		assertNull(QuickCheckRules.areaOf(story("s9"), LESSONS));
	}

	@Test
	void unansweredAreasRankAfterAnsweredOnesAndGiveTheirFirstLesson() {
		StoryPlan answeredInvesting = plan(Set.of(), right(I21_A));
		assertEquals("s2", answeredInvesting.start().id());
		assertEquals(List.of("s2", "s4", "s1", "s3"), answeredInvesting.pathStoryIds());

		StoryPlan none = plan(Set.of());
		assertEquals("s1", none.start().id());
		assertEquals(List.of("s1", "s3", "s2", "s4"), none.pathStoryIds());
	}

	@Test
	void aSolidAreaHasNoCandidatesButOneStrongAnswerIsOnlyBuilding() {
		StoryPlan oneAnswer = plan(Set.of(), right(S11_A));
		assertEquals("s1", oneAnswer.start().id());

		StoryPlan solidSaving = plan(Set.of(), right(S11_A), right(S31));
		assertEquals(List.of("s2", "s4"), solidSaving.pathStoryIds());
	}

	@Test
	void withEveryAreaSolidTheFirstStoryWithALessonLeftIsReadyForNext() {
		Answer[] allSure = { right(S11_A), right(S31), right(I21_A), right(I41) };

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
		StoryPlan plan = plan(done("s2", "s4"), right(S11_A), right(S31), notSure(I21_A));

		assertEquals("s1", plan.start().id());
		assertFalse(plan.readyForNext());
	}

	@Test
	void jevChoosesTheFirstLessonAmongTwoPerAnsweredAreaTheOnesAnsweredNotRightFirst() {
		Answer[] answers = { wrong(S12), right(I21_A) };
		List<CheckLesson> pool = QuickCheckRules.pool(candidates(Set.of(), answers), List.of(answers));

		// Saving: the lesson answered wrong, then one of each story. Investing: one of each story.
		assertEquals(List.of("s1-2", "s1-1", "s2-1", "s4-1"),
				ids(QuickCheckRules.firstLessonChoices(pool, List.of(answers), Set.of())));
		assertEquals(List.of("s1-2", "s3-1", "s2-1", "s4-1"),
				ids(QuickCheckRules.firstLessonChoices(pool, List.of(answers), Set.of("s1-1"))));
	}

	@Test
	void withOneLessonToStartWithJevIsNotAsked() {
		Answer[] answers = { wrong(S31), right(I21_A), right(I41) };
		Set<String> completed = Set.of("s1-1", "s1-2");
		List<CheckLesson> pool = QuickCheckRules.pool(candidates(completed, answers), List.of(answers));

		assertEquals(List.of(), QuickCheckRules.firstLessonChoices(pool, List.of(answers), completed));
	}

	@Test
	void onlyAnsweredAreasTheFactsSpeakAboutCanHaveAGap() {
		List<Answer> investingOnly = List.of(right(I21_A));
		assertEquals(List.of(INVESTING), QuickCheckRules.gapAreas(ORDER, investingOnly, facts(true, true)));
		assertEquals(List.of(), QuickCheckRules.gapAreas(ORDER, investingOnly, null));
		assertEquals(List.of(), QuickCheckRules.gapAreas(List.of(FocusArea.RISK),
				List.of(right(q("s1-1", "q9", FocusArea.RISK))), facts(true, true)));
	}

}
