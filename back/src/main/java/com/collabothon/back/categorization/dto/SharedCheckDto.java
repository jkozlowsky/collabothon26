package com.collabothon.back.categorization.dto;

/** What was sent about one check: whether an answer went out, never its text. */
public record SharedCheckDto(
		String questionId,
		boolean answered
) {}
