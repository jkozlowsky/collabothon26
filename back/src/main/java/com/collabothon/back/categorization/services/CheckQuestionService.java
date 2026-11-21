package com.collabothon.back.categorization.services;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import jakarta.validation.Validator;

import org.springframework.stereotype.Service;

import com.collabothon.back.categorization.config.JevProperties;
import com.collabothon.back.categorization.consts.CategorizationConsts;
import com.collabothon.back.categorization.dto.CheckAnswerDto;
import com.collabothon.back.categorization.dto.CheckQuestionDto;
import com.collabothon.back.categorization.enums.CheckCategory;
import com.collabothon.back.categorization.mappers.CheckQuestionMapper;
import com.collabothon.back.categorization.repositories.CheckQuestionRepository;
import com.collabothon.back.categorization.repositories.projections.CheckQuestionProjection;
import com.collabothon.back.common.exceptions.BadRequestException;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
public class CheckQuestionService {

	private final CheckQuestionRepository questions;

	private final CheckQuestionMapper mapper;

	private final JevProperties jev;

	private final Validator validator;

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

	/** The questions behind the answers, in answer order; the messages never repeat what was sent. */
	List<CheckQuestionProjection> pick(List<CheckAnswerDto> answers) {
		if (answers.stream().anyMatch(answer -> !validator.validate(answer).isEmpty())) {
			throw new BadRequestException("Each answer needs a question id and text of 1 to "
					+ CategorizationConsts.MAX_ANSWER_LENGTH + " characters, or null for Not sure");
		}
		Map<String, CheckQuestionProjection> byId = questions.findPool()
			.stream()
			.collect(Collectors.toMap(CheckQuestionProjection::id, Function.identity()));
		List<CheckQuestionProjection> picked = answers.stream().map(answer -> byId.get(answer.questionId())).toList();
		if (picked.contains(null) || picked.stream().distinct().count() != picked.size()) {
			throw new BadRequestException("Answer each known check question once");
		}
		boolean balanced = Arrays.stream(CheckCategory.values())
			.allMatch(category -> picked.stream().filter(q -> q.category() == category).count() == CategorizationConsts.CHECKS_PER_CATEGORY);
		if (!balanced) {
			throw new BadRequestException("Answer " + CategorizationConsts.CHECKS_PER_CATEGORY
					+ " finance and " + CategorizationConsts.CHECKS_PER_CATEGORY + " investing questions");
		}
		return picked;
	}

}
