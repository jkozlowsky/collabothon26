package com.collabothon.back.glossary.services;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.glossary.repositories.GlossaryFavoriteRepository;
import com.collabothon.back.glossary.repositories.GlossaryTermRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GlossaryUserService {

	private final GlossaryFavoriteRepository favoriteRepository;
	private final GlossaryTermRepository termRepository;

	@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
	public List<String> getFavorites(String userId) {
		return favoriteRepository.findSlugsByUserId(userId);
	}

	@Transactional(readOnly = false, propagation = Propagation.REQUIRES_NEW)
	public void addFavorite(String userId, String slug) {
		int added = favoriteRepository.addFavorite(userId, slug);
		if (added == 0 && !termRepository.existsBySlug(slug)) {
			throw new BusinessException(GlossaryErrorCode.TERM_NOT_FOUND);
		}
	}

	@Transactional(readOnly = false, propagation = Propagation.REQUIRES_NEW)
	public void removeFavorite(String userId, String slug) {
		favoriteRepository.deleteFavorite(userId, slug);
	}

}
