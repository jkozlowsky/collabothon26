package com.collabothon.back.lesson;

import java.io.Serializable;

public record ConceptKnowledgeId(
		String userId,
		String concept
) implements Serializable {}
