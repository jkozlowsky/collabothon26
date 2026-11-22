package com.collabothon.back.duel.services;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.collabothon.back.config.DuelProperties;
import com.collabothon.back.dto.lesson.Story;
import com.collabothon.back.duel.repositories.DuelAnswerRepository;
import com.collabothon.back.duel.repositories.DuelContentRepository;
import com.collabothon.back.duel.repositories.DuelMatchRepository;
import com.collabothon.back.entities.duel.DuelAnswer;
import com.collabothon.back.entities.duel.DuelMatch;
import com.collabothon.back.entities.duel.DuelQuestion;
import com.collabothon.back.lesson.repositories.StoryRepository;

import lombok.RequiredArgsConstructor;

/**
 * Deterministic question selection for a duel match (spec §3.3):
 * - Slots split evenly over ticked categories (remainder to random categories)
 * - Questions unseen in player's last 2 matches prioritized
 * - Top-up via duelFallback story id or other available categories
 * - At most 2 of the same step type in a row when possible
 * - Seeded by matchId
 */
@Service
@RequiredArgsConstructor
public class DuelSelectionService {

	private final DuelContentRepository content;

	private final StoryRepository stories;

	private final DuelMatchRepository matches;

	private final DuelAnswerRepository answers;

	private final DuelProperties properties;

	public List<DuelQuestion> selectQuestions(DuelMatch match) {
		Set<String> seenQuestionIds = findSeenQuestionIds(match.getUserId(), match.getId());
		return select(match.getId(), match.getCategories(), seenQuestionIds, properties.questionsPerMatch());
	}

	public Set<String> findSeenQuestionIds(String userId, Long matchId) {
		if (userId == null || userId.isBlank() || matchId == null) {
			return Set.of();
		}
		List<DuelMatch> prevMatches = matches.findTop2ByUserIdAndIdLessThanOrderByIdDesc(userId, matchId);
		if (prevMatches.isEmpty()) {
			return Set.of();
		}
		List<Long> matchIds = prevMatches.stream().map(DuelMatch::getId).toList();
		return answers.findByMatchIdInOrderByPosition(matchIds)
			.stream()
			.map(DuelAnswer::getQuestionId)
			.collect(Collectors.toSet());
	}

	public List<DuelQuestion> select(long matchId, List<String> tickedCategories, Set<String> seenQuestionIds, int totalSlots) {
		if (tickedCategories == null || tickedCategories.isEmpty()) {
			throw new IllegalArgumentException("Categories cannot be empty");
		}
		Random random = new Random(matchId);

		int k = tickedCategories.size();
		int base = totalSlots / k;
		int remainder = totalSlots % k;

		Map<String, Integer> slotsPerCategory = new LinkedHashMap<>();
		for (String cat : tickedCategories) {
			slotsPerCategory.put(cat, base);
		}
		if (remainder > 0) {
			List<String> shuffledCats = new ArrayList<>(tickedCategories);
			Collections.shuffle(shuffledCats, random);
			for (int i = 0; i < remainder; i++) {
				String cat = shuffledCats.get(i);
				slotsPerCategory.put(cat, slotsPerCategory.get(cat) + 1);
			}
		}

		Set<String> chosenIds = new HashSet<>();
		List<DuelQuestion> chosenQuestions = new ArrayList<>(totalSlots);

		for (String cat : tickedCategories) {
			int needed = slotsPerCategory.get(cat);
			collectQuestionsForCategory(cat, needed, seenQuestionIds, chosenIds, chosenQuestions, random);
		}

		// If still short of totalSlots, fill from any available category
		if (chosenQuestions.size() < totalSlots) {
			fillRemaining(totalSlots - chosenQuestions.size(), seenQuestionIds, chosenIds, chosenQuestions, random);
		}

		return arrangeQuestions(chosenQuestions, random);
	}

	private void collectQuestionsForCategory(String cat, int needed, Set<String> seenQuestionIds,
			Set<String> chosenIds, List<DuelQuestion> chosenQuestions, Random random) {
		int collected = drawFromCategory(cat, needed, seenQuestionIds, chosenIds, chosenQuestions, random);
		if (collected >= needed) {
			return;
		}

		// Fallback category
		String fallback = stories.findById(cat).map(Story::duelFallback).orElse(null);
		if (fallback != null && !fallback.isBlank()) {
			collected += drawFromCategory(fallback, needed - collected, seenQuestionIds, chosenIds, chosenQuestions, random);
			if (collected >= needed) {
				return;
			}
		}

		// Any other available category
		for (Story s : stories.findAll()) {
			String otherCat = s.id();
			if (otherCat.equals(cat) || otherCat.equals(fallback)) {
				continue;
			}
			if (content.hasDuelContent(otherCat)) {
				collected += drawFromCategory(otherCat, needed - collected, seenQuestionIds, chosenIds, chosenQuestions, random);
				if (collected >= needed) {
					return;
				}
			}
		}
	}

	private void fillRemaining(int remainingNeeded, Set<String> seenQuestionIds, Set<String> chosenIds,
			List<DuelQuestion> chosenQuestions, Random random) {
		for (Story s : stories.findAll()) {
			if (content.hasDuelContent(s.id())) {
				int got = drawFromCategory(s.id(), remainingNeeded, seenQuestionIds, chosenIds, chosenQuestions, random);
				remainingNeeded -= got;
				if (remainingNeeded <= 0) {
					return;
				}
			}
		}
	}

	private int drawFromCategory(String category, int countNeeded, Set<String> seenQuestionIds,
			Set<String> chosenIds, List<DuelQuestion> chosenQuestions, Random random) {
		List<DuelQuestion> pool = content.findByStory(category);
		if (pool.isEmpty() || countNeeded <= 0) {
			return 0;
		}

		List<DuelQuestion> available = pool.stream()
			.filter(q -> !chosenIds.contains(q.id()))
			.toList();

		List<DuelQuestion> unseen = new ArrayList<>();
		List<DuelQuestion> seen = new ArrayList<>();
		for (DuelQuestion q : available) {
			if (seenQuestionIds.contains(q.id())) {
				seen.add(q);
			} else {
				unseen.add(q);
			}
		}

		Collections.shuffle(unseen, random);
		Collections.shuffle(seen, random);

		int added = 0;
		for (DuelQuestion q : unseen) {
			if (added >= countNeeded) break;
			chosenIds.add(q.id());
			chosenQuestions.add(q);
			added++;
		}
		for (DuelQuestion q : seen) {
			if (added >= countNeeded) break;
			chosenIds.add(q.id());
			chosenQuestions.add(q);
			added++;
		}
		return added;
	}

	private List<DuelQuestion> arrangeQuestions(List<DuelQuestion> questions, Random random) {
		List<DuelQuestion> list = new ArrayList<>(questions);
		Collections.shuffle(list, random);
		if (!hasThreeInARow(list)) {
			return list;
		}

		List<DuelQuestion> result = new ArrayList<>(list.size());
		boolean[] used = new boolean[list.size()];
		if (backtrack(list, used, result)) {
			return result;
		}
		return list;
	}

	private static boolean hasThreeInARow(List<DuelQuestion> list) {
		for (int i = 0; i < list.size() - 2; i++) {
			if (list.get(i).type().equals(list.get(i + 1).type())
					&& list.get(i).type().equals(list.get(i + 2).type())) {
				return true;
			}
		}
		return false;
	}

	private static boolean backtrack(List<DuelQuestion> questions, boolean[] used, List<DuelQuestion> current) {
		if (current.size() == questions.size()) {
			return true;
		}
		int pos = current.size();
		for (int i = 0; i < questions.size(); i++) {
			if (used[i]) continue;
			DuelQuestion candidate = questions.get(i);
			if (pos >= 2 && candidate.type().equals(current.get(pos - 1).type())
					&& candidate.type().equals(current.get(pos - 2).type())) {
				continue;
			}
			used[i] = true;
			current.add(candidate);
			if (backtrack(questions, used, current)) {
				return true;
			}
			current.removeLast();
			used[i] = false;
		}
		return false;
	}

}
