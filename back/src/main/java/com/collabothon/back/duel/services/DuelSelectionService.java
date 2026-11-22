package com.collabothon.back.duel.services;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
import java.util.function.Predicate;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.config.DuelProperties;
import com.collabothon.back.duel.demo.DuelDemoRules;
import com.collabothon.back.duel.demo.RiskQuestions;
import com.collabothon.back.duel.models.DuelQuestion;
import com.collabothon.back.duel.repositories.DuelAnswerRepository;
import com.collabothon.back.duel.repositories.DuelContentRepository;
import com.collabothon.back.duel.repositories.DuelMatchRepository;
import com.collabothon.back.entities.duel.DuelAnswer;
import com.collabothon.back.entities.duel.DuelMatch;
import com.collabothon.back.lesson.models.Story;
import com.collabothon.back.lesson.repositories.StoryRepository;

import lombok.RequiredArgsConstructor;

/**
 * A match's questions are recomputed from its seed on every request instead of stored, so the order of the random
 * draws here is part of the contract.
 */
@Service
@RequiredArgsConstructor
public class DuelSelectionService {

	private final DuelContentRepository content;

	private final StoryRepository stories;

	private final DuelMatchRepository matches;

	private final DuelAnswerRepository answers;

	private final DuelProperties properties;

	@Transactional(readOnly = true, propagation = Propagation.MANDATORY)
	public List<DuelQuestion> selectQuestions(DuelMatch match) {
		RiskQuestions riskQuestions = DuelDemoRules.riskQuestions(match);
		int slots = properties.questionsPerMatch();
		if (match.isLive()) {
			// Both players of a live duel get the same questions: one shared seed and no per-player history.
			long sharedSeed = Math.min(match.getId(), match.getOpponentMatchId());
			return select(sharedSeed, match.getCategories(), Set.of(), slots, riskQuestions);
		}
		return select(match.getId(), match.getCategories(), seenInPreviousMatches(match), slots, riskQuestions);
	}

	List<DuelQuestion> select(long seed, List<String> categories, Set<String> seenIds, int totalSlots,
			RiskQuestions riskQuestions) {
		if (categories.isEmpty()) {
			throw new IllegalArgumentException("Categories cannot be empty");
		}
		Random random = new Random(seed);
		Map<String, Integer> slots = slotsPerCategory(categories, totalSlots, random);
		QuestionDraw draw = new QuestionDraw(random, seenIds);
		for (String category : categories) {
			if (riskQuestions.areFixedFor(category)) {
				DuelDemoRules.fixedRiskQuestions(content, slots.get(category)).forEach(draw::add);
			}
			else {
				drawForCategory(category, slots.get(category), draw);
			}
		}
		if (draw.size() < totalSlots) {
			drawFromAreas(stories.canonicalAreaSlugs(), totalSlots - draw.size(), draw);
		}
		return arrange(draw.questions(), random, riskQuestions);
	}

	private Set<String> seenInPreviousMatches(DuelMatch match) {
		List<DuelMatch> previous = matches.findTop2ByUserIdAndIdLessThanOrderByIdDesc(match.getUserId(), match.getId());
		if (previous.isEmpty()) {
			return Set.of();
		}
		return answers.findByMatchIdInOrderByPosition(previous.stream().map(DuelMatch::getId).toList())
			.stream()
			.map(DuelAnswer::getQuestionId)
			.collect(Collectors.toSet());
	}

	private static Map<String, Integer> slotsPerCategory(List<String> categories, int totalSlots, Random random) {
		Map<String, Integer> slots = new LinkedHashMap<>();
		categories.forEach(category -> slots.put(category, totalSlots / categories.size()));
		int remainder = totalSlots % categories.size();
		if (remainder > 0) {
			List<String> shuffled = new ArrayList<>(categories);
			Collections.shuffle(shuffled, random);
			shuffled.subList(0, remainder).forEach(category -> slots.merge(category, 1, Integer::sum));
		}
		return slots;
	}

	private void drawForCategory(String category, int needed, QuestionDraw draw) {
		int missing = needed - draw.draw(content.findByArea(category), needed);
		if (missing > 0) {
			drawFromAreas(backupAreas(category), missing, draw);
		}
	}

	private void drawFromAreas(List<String> areas, int needed, QuestionDraw draw) {
		int missing = needed;
		for (String area : areas) {
			missing -= draw.draw(content.findByArea(area), missing);
			if (missing <= 0) {
				return;
			}
		}
	}

	/** The area's fallback first, then every other area in canonical order. */
	private List<String> backupAreas(String category) {
		List<String> areas = new ArrayList<>(stories.canonicalAreaSlugs());
		areas.remove(category);
		fallbackArea(category).ifPresent(fallback -> {
			areas.remove(fallback);
			areas.addFirst(fallback);
		});
		return areas;
	}

	private Optional<String> fallbackArea(String category) {
		return stories.findByAreaSlug(category).stream()
			.map(Story::duelFallback)
			.filter(Objects::nonNull)
			.findFirst()
			.map(storyId -> stories.findById(storyId).map(Story::areaSlug).orElse(storyId))
			.filter(Predicate.not(String::isBlank));
	}

	private List<DuelQuestion> arrange(List<DuelQuestion> questions, Random random, RiskQuestions riskQuestions) {
		List<DuelQuestion> shuffled = new ArrayList<>(questions);
		Collections.shuffle(shuffled, random);
		List<DuelQuestion> arranged = DuelQuestionOrder.withoutThreeInARow(shuffled);
		if (riskQuestions == RiskQuestions.RANDOM) {
			return arranged;
		}
		return DuelQuestionOrder.withoutThreeInARow(DuelDemoRules.inFixedRiskOrder(content, arranged));
	}

}
