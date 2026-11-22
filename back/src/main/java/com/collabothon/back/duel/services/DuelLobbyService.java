package com.collabothon.back.duel.services;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.dto.duel.CategoryDto;
import com.collabothon.back.dto.lesson.Story;
import com.collabothon.back.duel.repositories.DuelContentRepository;
import com.collabothon.back.lesson.repositories.StoryRepository;
import com.collabothon.back.xp.services.LevelCurve;
import com.collabothon.back.xp.services.XpService;

import lombok.RequiredArgsConstructor;

/** The duel lobby: the 5 area categories in canonical order, with the user's level in each. */
@Service
@RequiredArgsConstructor
public class DuelLobbyService {

	private final StoryRepository stories;

	private final DuelContentRepository content;

	private final XpService xpService;

	private final LevelCurve levelCurve;

	/** @param userId may be null or blank: every category then shows level 1 */
	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public List<CategoryDto> categories(String userId) {
		Map<String, Integer> xpPerCategory = xpService.xpPerCategory(userId);
		return stories.canonicalAreaSlugs().stream()
			.filter(content::hasDuelContent)
			.map(areaSlug -> toCategory(areaSlug, xpPerCategory.getOrDefault(areaSlug, 0)))
			.flatMap(Optional::stream)
			.toList();
	}

	private Optional<CategoryDto> toCategory(String areaSlug, int xp) {
		Optional<Story> firstOpt = stories.findFirstByAreaSlug(areaSlug);
		if (firstOpt.isEmpty()) {
			return Optional.empty();
		}
		Story first = firstOpt.get();
		String icon = "risk".equals(areaSlug) ? "alert-triangle" : first.icon();
		String color = "risk".equals(areaSlug) ? "violet" : first.color();
		LevelCurve.LevelInfo level = levelCurve.fromXp(xp);
		return Optional.of(new CategoryDto(
				areaSlug,
				first.area(),
				icon,
				color,
				xp,
				level.level(),
				level.xpIntoLevel(),
				level.xpForLevel()
		));
	}

}
