package com.collabothon.back.duel.services;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.dto.converters.duel.DuelPlayerMapper;
import com.collabothon.back.dto.duel.PlayerCardDto;
import com.collabothon.back.duel.models.PlayerIdentity;
import com.collabothon.back.entities.duel.DuelMatch;
import com.collabothon.back.lesson.repositories.StoryRepository;
import com.collabothon.back.profile.repositories.AccountRepository;
import com.collabothon.back.xp.services.LevelCurve;
import com.collabothon.back.xp.services.XpService;

import lombok.RequiredArgsConstructor;

// REQUIRED: the duel services call this inside their transaction, with rows that are not committed yet.
@Service
@RequiredArgsConstructor
public class DuelPlayerCardService {

	private final AccountRepository accounts;

	private final XpService xpService;

	private final LevelCurve levelCurve;

	private final StoryRepository stories;

	private final DuelPlayerMapper playerMapper;

	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public PlayerCardDto card(String userId) {
		Map<String, Integer> xpPerCategory = xpService.xpPerCategory(userId);
		Map<String, Integer> levels = new LinkedHashMap<>();
		for (String area : stories.canonicalAreaSlugs()) {
			levels.put(area, levelCurve.fromXp(xpPerCategory.getOrDefault(area, 0)).level());
		}
		return playerMapper.toCard(PlayerIdentity.of(userId, accounts.findById(userId)), levels);
	}

	/** Null in SOLO matches. */
	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public PlayerCardDto rivalCard(DuelMatch match) {
		String rivalUserId = match.getRivalUserId();
		if (rivalUserId == null) {
			return null;
		}
		return card(rivalUserId);
	}

}
