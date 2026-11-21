package com.collabothon.back.categorization.controllers;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.collabothon.back.categorization.dto.CheckQuestionDto;
import com.collabothon.back.categorization.services.CheckQuestionService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/check-questions")
@RequiredArgsConstructor
class CheckQuestionController {

	private final CheckQuestionService service;

	@GetMapping
	List<CheckQuestionDto> pool() {
		return service.pool();
	}

}
