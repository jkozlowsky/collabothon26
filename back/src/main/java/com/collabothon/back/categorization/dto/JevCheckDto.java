package com.collabothon.back.categorization.dto;

public record JevCheckDto(
		String questionId,
		String genericPrompt,
		String criterion,
		String answer
) {

	@Override
	public String toString() {
		return "JevCheckDto[questionId=" + questionId + ", genericPrompt=" + genericPrompt + ", criterion=" + criterion
				+ ", answer=redacted]";
	}

}
