package com.collabothon.back.duel.services;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.dto.converters.duel.DuelCategoryMapper;
import com.collabothon.back.dto.duel.CategoryDto;
import com.collabothon.back.dto.lesson.Story;
import com.collabothon.back.lesson.repositories.StoryRepository;
import com.collabothon.back.xp.services.LevelCurve;
import com.collabothon.back.xp.services.XpService;

import lombok.RequiredArgsConstructor;

/** The duel lobby: one category per story, in stories.json order, with the user's level in it. */
@Service
@RequiredArgsConstructor
public class DuelLobbyService {

	private final StoryRepository stories;

	private final XpService xpService;

	private final LevelCurve levelCurve;

	private final DuelCategoryMapper categoryMapper;

	/** @param userId may be null or blank: every category then shows level 1 */
	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public List<CategoryDto> categories(String userId) {
		Map<String, Integer> xpPerCategory = xpService.xpPerCategory(userId);
		return stories.findAll()
			.stream()
			.map(story -> toCategory(story, xpPerCategory.getOrDefault(story.id(), 0)))
			.toList();
	}

	private CategoryDto toCategory(Story story, int xp) {
		return categoryMapper.toDto(story, xp, levelCurve.fromXp(xp));
	}

}
