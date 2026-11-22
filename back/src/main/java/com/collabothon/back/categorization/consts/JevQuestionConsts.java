package com.collabothon.back.categorization.consts;

public final class JevQuestionConsts {

	public static final String ROLE = "role";

	public static final String FOCUS_PREFIX = "focus_";

	public static final String MASTERY_PREFIX = "mastery_";

	public static final String NEXT = "next";

	public static final String FIRST = "first";

	public static final String ENOUGH = "enough";

	public static final String FIRST_LESSON = "first_lesson";

	// Verbatim from docs/specs/F1-profiling.md ("Jev call").
	public static final String CATEGORIZATION_QUESTIONS = """
			{
			  "role": {"type": "choice",
			    "instructions": "Which learner level fits this person best, judging by the facts about their accounts in `facts` and their knowledge answers in `checkAnswers`, when present?",
			    "criteria": {
			      "novice": "Is starting out: has no habit of regular saving and no investments, and any knowledge answers show that basic money ideas are still new to them.",
			      "intermediate": "Has some of the basics: saves regularly or invests but not both, or their knowledge answers are mixed or ahead of these habits.",
			      "advanced": "Is past the basics: saves regularly and invests, and any knowledge answers show that they understand the ideas they were asked about."}},
			  "focus_saving":     {"type": "noul", "instructions": "Would learning how to build an emergency fund help this person now?"},
			  "focus_debt":       {"type": "noul", "instructions": "Would learning how to avoid expensive debt help this person now?"},
			  "focus_investing":  {"type": "noul", "instructions": "Would learning how investing works help this person now?"},
			  "focus_risk":       {"type": "noul", "instructions": "Would learning how to spread financial risk help this person now?"},
			  "focus_retirement": {"type": "noul", "instructions": "Would learning how to plan for retirement help this person now?"}
			}
			""";

	// Verbatim from docs/specs/F1b-quick-check.md ("Jev step call"); the criteria are filled per request.
	public static final String STEP_QUESTIONS = """
			{
			  "mastery_saving":    {"type": "noul", "instructions": "Do this person's saving answers, the entries of `answers` whose `area` is saving, show that they understand ideas such as inflation, an emergency fund and how savings grow?"},
			  "mastery_debt":      {"type": "noul", "instructions": "Do this person's borrowing answers, the entries of `answers` whose `area` is debt, show that they understand ideas such as instalments, card debt and the full cost of a loan?"},
			  "mastery_investing": {"type": "noul", "instructions": "Do this person's investing answers, the entries of `answers` whose `area` is investing, show that they understand ideas such as market falls, borrowing to invest and spreading risk?"},
			  "next": {"type": "choice",
			    "instructions": "The next test question will come from one of these lessons. Which lesson would show best what this person still needs to learn, given their answers so far in `answers`, when they might need their money in `profile.horizon` (when given) and, when given, the topics they said are new to them in `interests`?",
			    "criteria": {}},
			  "first": {"type": "choice",
			    "instructions": "The first test question will come from one of these lessons. Which lesson's topic matters most for this person's situation, given when they might need their money in `profile.horizon` (when given) and, when given, the topics they said are new to them in `interests` and the facts about their accounts in `facts`?",
			    "criteria": {}},
			  "enough": {"type": "noul", "instructions": "Do the answers so far show clearly enough what this person already understands and what they should learn first?"}
			}
			""";

	// Verbatim from docs/specs/F1b-quick-check.md ("Jev final call"); the criteria are filled per request.
	public static final String QUICK_CHECK_QUESTIONS = """
			{
			  "first_lesson": {"type": "choice",
			    "instructions": "Which of these lessons should this person start with, given which ideas their knowledge answers in `checkAnswers` show they have not mastered yet?",
			    "criteria": {}}
			}
			""";

	public static final String INTEREST_NOTE = "The person picked this path as new to them.";

	public static final String SOLID_INTEREST_NOTE = "The person picked this path as new to them; the test showed they"
			+ " already know the basics.";

}
