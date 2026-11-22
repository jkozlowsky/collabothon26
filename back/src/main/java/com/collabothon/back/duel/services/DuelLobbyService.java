package com.collabothon.back.duel.services;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.dto.converters.duel.DuelCategoryMapper;
import com.collabothon.back.dto.duel.CategoryDto;
import com.collabothon.back.duel.demo.DuelDemoRules;
import com.collabothon.back.duel.repositories.DuelContentRepository;
import com.collabothon.back.lesson.repositories.StoryRepository;
import com.collabothon.back.xp.services.LevelCurve;
import com.collabothon.back.xp.services.XpService;

import lombok.RequiredArgsConstructor;

/** The lobby tiles: the areas in canonical order, each styled like its first story. */
@Service
@RequiredArgsConstructor
public class DuelLobbyService {

	private final StoryRepository stories;

	private final DuelContentRepository content;

	private final XpService xpService;

	private final LevelCurve levelCurve;

	private final DuelCategoryMapper categoryMapper;

	/** Without a user id every category shows level 1. */
	@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
	public List<CategoryDto> categories(String userId) {
		Map<String, Integer> xpPerCategory = xpService.xpPerCategory(userId);
		return stories.canonicalAreaSlugs().stream()
			.filter(content::hasDuelContent)
			.map(areaSlug -> toCategory(areaSlug, xpPerCategory.getOrDefault(areaSlug, 0)))
			.flatMap(Optional::stream)
			.toList();
	}

	private Optional<CategoryDto> toCategory(String areaSlug, int xp) {
		return stories.findByAreaSlug(areaSlug)
			.stream()
			.findFirst()
			.map(first -> categoryMapper.toDto(areaSlug, first, DuelDemoRules.lobbyStyle(areaSlug, first), xp,
					levelCurve.fromXp(xp)));
	}

}
