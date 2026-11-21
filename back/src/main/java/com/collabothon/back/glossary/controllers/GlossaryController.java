package com.collabothon.back.glossary.controllers;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.collabothon.back.dto.glossary.CategoryDto;
import com.collabothon.back.dto.glossary.TermDetail;
import com.collabothon.back.glossary.services.GlossaryService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/glossary")
@RequiredArgsConstructor
public class GlossaryController {

	private final GlossaryService glossaryService;

	@GetMapping
	public ResponseEntity<List<CategoryDto>> list() {
		return ResponseEntity.ok(glossaryService.getCategories());
	}

	@GetMapping("/terms/{slug}")
	public ResponseEntity<TermDetail> get(@PathVariable String slug) {
		return ResponseEntity.ok(glossaryService.getTerm(slug));
	}
}
