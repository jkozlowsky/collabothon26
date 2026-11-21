package com.collabothon.back.duel.services;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.dto.duel.PlayerCardDto;
import com.collabothon.back.dto.lesson.Story;
import com.collabothon.back.entities.duel.DuelMatch;
import com.collabothon.back.lesson.repositories.StoryRepository;
import com.collabothon.back.entities.profile.Account;
import com.collabothon.back.profile.repositories.AccountRepository;
import com.collabothon.back.xp.services.LevelCurve;
import com.collabothon.back.xp.services.XpService;

import lombok.RequiredArgsConstructor;

/** Builds the player cards shown in a duel: first name and avatar from the account, level per story from XP. */
@Service
@RequiredArgsConstructor
public class DuelPlayerCardService {

	static final String DEFAULT_AVATAR = "m1";

	private final AccountRepository accounts;

	private final XpService xpService;

	private final LevelCurve levelCurve;

	private final StoryRepository stories;

	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public PlayerCardDto card(String userId) {
		Map<String, Integer> xpPerCategory = xpService.xpPerCategory(userId);
		Map<String, Integer> levels = new LinkedHashMap<>();
		for (Story story : stories.findAll()) {
			levels.put(story.id(), levelCurve.fromXp(xpPerCategory.getOrDefault(story.id(), 0)).level());
		}
		Optional<Account> account = accounts.findById(userId);
		String name = account.map(Account::getFirstName).orElse(userId);
		String avatar = account.map(Account::getAvatar).orElse(DEFAULT_AVATAR);
		return new PlayerCardDto(name, avatar, levels);
	}

	/** The rival's card, or null in SOLO matches. */
	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public PlayerCardDto rivalCard(DuelMatch match) {
		if (match.getRivalUserId() == null) {
			return null;
		}
		return card(match.getRivalUserId());
	}

}
