package com.collabothon.back.glossary.services;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.dto.converters.glossary.GlossaryMapper;
import com.collabothon.back.dto.glossary.CategoryDto;
import com.collabothon.back.dto.glossary.TermDetail;
import com.collabothon.back.entities.glossary.GlossaryTerm;
import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.glossary.repositories.GlossaryCategoryRepository;
import com.collabothon.back.glossary.repositories.GlossaryTermRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GlossaryService {

	private final GlossaryCategoryRepository categoryRepository;
	private final GlossaryTermRepository termRepository;
	private final GlossaryMapper glossaryMapper;

	@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
	public List<CategoryDto> getCategories() {
		return categoryRepository.findAllByOrderByPosition()
				.stream()
				.filter(c -> !c.getTerms().isEmpty())
				.map(glossaryMapper::toCategoryDto)
				.toList();
	}

	@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
	public TermDetail getTerm(String slug) {
		GlossaryTerm term = termRepository.findBySlug(slug)
				.orElseThrow(() -> new BusinessException(GlossaryErrorCode.TERM_NOT_FOUND));
		return glossaryMapper.toTermDetail(term);
	}

}
