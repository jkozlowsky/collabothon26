package com.collabothon.back.duel.demo;

import java.util.ArrayList;
import java.util.List;

import com.collabothon.back.common.consts.DemoConsts;
import com.collabothon.back.duel.consts.DuelConsts;
import com.collabothon.back.duel.models.CategoryStyle;
import com.collabothon.back.duel.models.DuelQuestion;
import com.collabothon.back.duel.repositories.DuelContentRepository;
import com.collabothon.back.entities.duel.DuelMatch;
import com.collabothon.back.lesson.models.Story;

import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/** Every scripted exception of the demo: Alex always plays the same Risk questions, and Risk has its own tile. */
@NoArgsConstructor(access = AccessLevel.PRIVATE)
public final class DuelDemoRules {

	public static List<String> adjustCategories(String userId, List<String> categories) {
		if (!isAlex(userId)) {
			return categories;
		}
		return withRisk(categories);
	}

	public static List<String> adjustLiveCategories(String userA, String userB, List<String> categories) {
		if (!isAlex(userA) && !isAlex(userB)) {
			return categories;
		}
		return withRisk(categories);
	}

	// Only a live rival shares Alex's questions: against Alex as the simulated rival they are drawn as usual.
	public static RiskQuestions riskQuestions(DuelMatch match) {
		if (isAlex(match.getUserId()) || (match.isLive() && isAlex(match.getRivalUserId()))) {
			return RiskQuestions.FIXED_FOR_DEMO;
		}
		return RiskQuestions.RANDOM;
	}

	public static List<DuelQuestion> fixedRiskQuestions(DuelContentRepository content, int count) {
		return DuelDemoConsts.ALEX_RISK_QUESTION_IDS.stream()
			.limit(count)
			.map(id -> fixedQuestion(content, id))
			.toList();
	}

	public static List<DuelQuestion> inFixedRiskOrder(DuelContentRepository content, List<DuelQuestion> questions) {
		List<DuelQuestion> ordered = new ArrayList<>(questions.size());
		int nextRisk = 0;
		for (DuelQuestion question : questions) {
			if (DuelDemoConsts.RISK_CATEGORY.equals(question.category())) {
				ordered.add(fixedQuestion(content, DuelDemoConsts.ALEX_RISK_QUESTION_IDS.get(nextRisk++)));
			}
			else {
				ordered.add(question);
			}
		}
		return ordered;
	}

	public static CategoryStyle lobbyStyle(String areaSlug, Story story) {
		if (DuelDemoConsts.RISK_CATEGORY.equals(areaSlug)) {
			return new CategoryStyle(DuelDemoConsts.RISK_ICON, DuelDemoConsts.RISK_COLOR);
		}
		return new CategoryStyle(story.icon(), story.color());
	}

	private static boolean isAlex(String userId) {
		return DemoConsts.ALEX_USER_ID.equals(userId);
	}

	private static List<String> withRisk(List<String> categories) {
		if (categories.contains(DuelDemoConsts.RISK_CATEGORY)) {
			return categories;
		}
		List<String> adjusted = new ArrayList<>(categories);
		if (adjusted.size() >= DuelConsts.MAX_CATEGORIES) {
			adjusted.removeLast();
		}
		adjusted.add(DuelDemoConsts.RISK_CATEGORY);
		return adjusted;
	}

	private static DuelQuestion fixedQuestion(DuelContentRepository content, String id) {
		return content.findById(id)
			.orElseThrow(() -> new IllegalStateException("Missing Alex risk question " + id));
	}

}
