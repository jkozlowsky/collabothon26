package com.collabothon.back.categorization.dto;

/** One answered check as Jev sees it; {@code answer} is the person's text already wrapped as delimited data. */
public record JevCheckDto(
		String questionId,
		String genericPrompt,
		String criterion,
		String answer
) {}
