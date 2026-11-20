package com.collabothon.back.categorization.services;

import java.util.Optional;

/** {@code judgement} is empty when the caller must fall back to the rules; {@code sent} says if data left. */
public record JevResult(
		Optional<Judgement> judgement,
		boolean sent
) {

	static final JevResult SKIPPED = new JevResult(Optional.empty(), false);

}
