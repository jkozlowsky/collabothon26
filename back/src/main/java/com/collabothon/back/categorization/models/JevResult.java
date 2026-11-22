package com.collabothon.back.categorization.models;

import java.util.Optional;

import com.collabothon.back.categorization.enums.CategorizationSource;

// An empty judgement means the rules decide; sent says whether the data left, which the disclosure depends on.
public record JevResult(
		Optional<Judgement> judgement,
		boolean sent
) {

	public static final JevResult SKIPPED = new JevResult(Optional.empty(), false);

	public CategorizationSource source() {
		if (judgement.isPresent()) {
			return CategorizationSource.JEV;
		}
		return CategorizationSource.FALLBACK;
	}

}
