package com.collabothon.back.categorization.dto;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

// Bean Validation and Spring print rejected objects into logs, so the records must not carry the text there.
class AnswerRedactionTests {

	private static final String TEXT = "zzsentinelzz";

	@Test
	void anAnswerNeverPrintsItsText() {
		String printed = new CheckAnswerDto("savings-runway", TEXT).toString();

		assertFalse(printed.contains(TEXT), printed);
		assertTrue(printed.contains("savings-runway"), printed);
	}

	@Test
	void aJudgedCheckNeverPrintsItsAnswer() {
		String printed = new JevCheckDto("savings-runway", "prompt", "criterion", TEXT).toString();

		assertFalse(printed.contains(TEXT), printed);
		assertTrue(printed.contains("criterion"), printed);
	}

}
