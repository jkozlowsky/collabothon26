package com.collabothon.back.duel.services;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.dto.duel.MatchStartDto;
import com.collabothon.back.dto.duel.StartMatchRequest;
import com.collabothon.back.duel.demo.DuelDemoRules;
import com.collabothon.back.duel.repositories.DuelMatchRepository;
import com.collabothon.back.entities.duel.DuelMatch;
import com.collabothon.back.entities.duel.DuelMode;
import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.lesson.repositories.StoryRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DuelStartService {

	private final DuelMatchRepository matches;

	private final StoryRepository stories;

	private final DuelSelectionService selectionService;

	private final DuelProgressLoader progressLoader;

	private final DuelRivalSimulator rival;

	private final DuelPlayerCardService playerCards;

	private final DuelMatchView view;

	private final Clock clock;

	@Transactional(readOnly = false, propagation = Propagation.REQUIRES_NEW)
	public MatchStartDto start(StartMatchRequest request) {
		List<String> categories = DuelDemoRules.adjustCategories(request.userId(), request.categories());
		validateKnownCategories(categories);
		String rivalUserId = rivalFor(request);
		DuelMatch match = matches.save(DuelMatch.start(request.mode(), categories, request.userId(), rivalUserId,
				clock.instant()));
		return view.start(progressLoader.newMatch(match), selectionService.selectQuestions(match));
	}

	/** One row per player, each with the other as rival and sharing one question list. */
	@Transactional(readOnly = false, propagation = Propagation.REQUIRES_NEW)
	public LiveMatch startLive(String userA, String userB, List<String> categories) {
		List<String> adjusted = DuelDemoRules.adjustLiveCategories(userA, userB, categories);
		validateKnownCategories(adjusted);
		Instant now = clock.instant();
		DuelMatch matchA = matches.save(DuelMatch.start(DuelMode.HUMAN, adjusted, userA, userB, now));
		DuelMatch matchB = matches.save(DuelMatch.start(DuelMode.HUMAN, adjusted, userB, userA, now));
		matchA.linkOpponent(matchB.getId());
		matchB.linkOpponent(matchA.getId());
		return new LiveMatch(matchA.getId(), matchB.getId(), userA, userB, playerCards.card(userA),
				playerCards.card(userB), adjusted);
	}

	/** Null in SOLO, which has no rival. */
	private String rivalFor(StartMatchRequest request) {
		if (request.mode() == DuelMode.SOLO) {
			return null;
		}
		return rival.pickRival(request.userId());
	}

	private void validateKnownCategories(List<String> categories) {
		List<String> areas = stories.canonicalAreaSlugs();
		for (String category : categories) {
			if (!areas.contains(category)) {
				throw new BusinessException(DuelErrorCode.UNKNOWN_CATEGORY, category);
			}
		}
	}

}
