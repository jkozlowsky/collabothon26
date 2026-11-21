package com.collabothon.back.categorization.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.collabothon.back.categorization.dto.CheckQuestionDto;
import com.collabothon.back.categorization.dto.HistoryEntryDto;
import com.collabothon.back.categorization.mappers.CheckQuestionMapper;
import com.collabothon.back.categorization.repositories.CheckQuestionRepository;
import com.collabothon.back.categorization.repositories.projections.CheckQuestionProjection;
import com.collabothon.back.exceptions.BusinessException;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
public class CheckQuestionService {

	private final CheckQuestionRepository questions;

	private final CheckQuestionMapper mapper;

	public List<CheckQuestionDto> questions() {
		return bank().stream().map(mapper::toDto).toList();
	}

	List<CheckQuestionProjection> bank() {
		return questions.findBank();
	}

	/** The history checked against the bank; the messages never repeat a rejected value. */
	List<Answer> resolve(List<HistoryEntryDto> history, List<CheckQuestionProjection> bank) {
		Map<String, CheckQuestionProjection> byId = bank.stream()
			.collect(Collectors.toMap(CheckQuestionProjection::id, Function.identity()));
		List<Answer> answers = new ArrayList<>();
		for (HistoryEntryDto entry : history) {
			CheckQuestionProjection question = byId.remove(entry.questionId());
			if (question == null) {
				throw new BusinessException(CategorizationErrorCode.ANSWER_EACH_QUESTION_ONCE);
			}
			if (entry.optionIndex() != null && entry.optionIndex() >= question.options().size()) {
				throw new BusinessException(CategorizationErrorCode.PICK_ONE_OPTION);
			}
			answers.add(new Answer(question, entry.optionIndex(), entry.confidence()));
		}
		return answers;
	}

}
