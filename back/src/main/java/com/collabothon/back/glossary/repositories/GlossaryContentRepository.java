package com.collabothon.back.glossary.repositories;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Repository;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

@Repository
public class GlossaryContentRepository {

	private final ObjectNode glossary;
	private final Set<String> concepts;

	public GlossaryContentRepository(JsonMapper json) throws IOException {
		var resolver = new PathMatchingResourcePatternResolver();
		Resource res = resolver.getResource("classpath:content/glossary.json");
		try (InputStream in = res.getInputStream()) {
			this.glossary = (ObjectNode) json.readTree(in);
		}
		this.concepts = new HashSet<>(this.glossary.propertyNames());
	}

	public Set<String> concepts() {
		return concepts;
	}

	public Optional<JsonNode> findByConcept(String concept) {
		return Optional.ofNullable(glossary.get(concept));
	}

	public ObjectNode glossaryNode() {
		return glossary;
	}
}
