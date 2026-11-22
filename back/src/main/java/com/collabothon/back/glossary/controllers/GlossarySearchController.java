package com.collabothon.back.glossary.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.collabothon.back.common.validation.NoNul;
import com.collabothon.back.dto.glossary.SearchResult;
import com.collabothon.back.glossary.consts.GlossaryConsts;
import com.collabothon.back.glossary.services.GlossarySearchService;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/glossary/search")
@RequiredArgsConstructor
public class GlossarySearchController {

	private final GlossarySearchService searchService;

	@GetMapping
	public ResponseEntity<SearchResult> search(
			@RequestParam @NotBlank @Size(max = GlossaryConsts.MAX_QUERY_LENGTH) @NoNul String q) {
		return ResponseEntity.ok(searchService.search(q));
	}

}
