package com.collabothon.back.dto.glossary;

import java.util.List;

public record CategoryDto(
		String slug,
		String name,
		List<TermSummary> terms) {}
