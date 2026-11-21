package com.collabothon.back.categorization.services;

import java.util.Arrays;
import java.util.List;

import org.springframework.stereotype.Service;

import com.collabothon.back.categorization.config.JevProperties;
import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.dto.CheckQuestionDto;
import com.collabothon.back.categorization.enums.CheckCategory;
import com.collabothon.back.categorization.mappers.CheckQuestionMapper;
import com.collabothon.back.categorization.repositories.CheckQuestionRepository;
import com.collabothon.back.categorization.repositories.projections.CheckQuestionProjection;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
public class CheckQuestionService {

	private final CheckQuestionRepository questions;

	private final CheckQuestionMapper mapper;

	private final JevProperties jev;

	/** Empty when the Quick check cannot run: no judge to call, or a category too thin to draw from. */
	public List<CheckQuestionDto> pool() {
		if (!jev.callsJev()) {
			return List.of();
		}
		List<CheckQuestionProjection> pool = questions.findPool();
		boolean enough = Arrays.stream(CheckCategory.values())
			.allMatch(category -> pool.stream()
				.filter(q -> q.category() == category)
				.map(CheckQuestionProjection::area)
				.distinct()
				.count() >= CategorizationConsts.CHECKS_PER_CATEGORY);
		return enough ? pool.stream().map(mapper::toDto).toList() : List.of();
	}

}
