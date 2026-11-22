package com.collabothon.back.dto.glossary;

import java.util.List;

public record SearchResult(
		List<TermHit> terms,
		List<Mention> mentions,
		List<TermHit> suggestions) {}
