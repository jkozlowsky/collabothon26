package com.collabothon.back.dto.glossary;

import java.util.List;

public record TermDetail(String slug, String name, String fullName, CategoryRef category, String definitionStandard,
		String example, String graphicKey, List<TermRef> related) {
}
