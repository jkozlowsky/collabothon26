package com.collabothon.back.dto.glossary;

public record TermHit(
		String slug,
		String name,
		CategoryRef category,
		String shortDescription) {}
