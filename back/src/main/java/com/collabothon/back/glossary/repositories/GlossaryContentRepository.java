package com.collabothon.back.glossary.repositories;

import java.io.IOException;
import java.io.InputStream;
import java.util.Optional;
import java.util.Set;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Repository;

import com.collabothon.back.glossary.consts.GlossaryConsts;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Repository
public class GlossaryContentRepository {

	private final JsonNode glossary;
	private final Set<String> concepts;

	public GlossaryContentRepository(JsonMapper json) throws IOException {
		try (InputStream in = new ClassPathResource(GlossaryConsts.CONTENT_PATH).getInputStream()) {
			this.glossary = json.readTree(in);
		}
		this.concepts = Set.copyOf(glossary.propertyNames());
	}

	public Set<String> concepts() {
		return concepts;
	}

	public Optional<JsonNode> findByConcept(String concept) {
		return Optional.ofNullable(glossary.get(concept));
	}

}
