package com.collabothon.back.categorization.services;

import java.util.List;

import org.springframework.stereotype.Service;

import com.collabothon.back.categorization.dto.CheckQuestionDto;
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

	public List<CheckQuestionDto> questions() {
		return bank().stream().map(mapper::toDto).toList();
	}

	List<CheckQuestionProjection> bank() {
		return questions.findBank();
	}

}
