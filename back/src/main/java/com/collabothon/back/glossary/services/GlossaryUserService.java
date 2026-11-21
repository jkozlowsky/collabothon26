package com.collabothon.back.glossary.services;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.dto.glossary.PreferenceDto;
import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.glossary.repositories.GlossaryFavoriteRepository;
import com.collabothon.back.glossary.repositories.GlossaryPreferenceRepository;
import com.collabothon.back.glossary.repositories.GlossaryTermRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GlossaryUserService {

	private final GlossaryFavoriteRepository favoriteRepository;
	private final GlossaryPreferenceRepository preferenceRepository;
	private final GlossaryTermRepository termRepository;

	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public List<String> getFavorites(String userId) {
		return favoriteRepository.findSlugsByUserId(userId);
	}

	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public void addFavorite(String userId, String slug) {
		int added = favoriteRepository.addFavorite(userId, slug);
		if (added == 0 && !termRepository.existsBySlug(slug)) {
			throw new BusinessException(GlossaryErrorCode.TERM_NOT_FOUND);
		}
	}

	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public void removeFavorite(String userId, String slug) {
		favoriteRepository.deleteFavorite(userId, slug);
	}

	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public PreferenceDto getPreference(String userId) {
		String level = preferenceRepository.findLanguageLevelByUserId(userId).orElse(null);
		return new PreferenceDto(level);
	}

	@Transactional(readOnly = false, propagation = Propagation.REQUIRED)
	public PreferenceDto setPreference(String userId, String languageLevel) {
		preferenceRepository.upsertPreference(userId, languageLevel);
		return new PreferenceDto(languageLevel);
	}

}
