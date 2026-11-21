package com.collabothon.back.glossary;

import java.io.Serializable;

record GlossaryFavoriteId(
		String userId,
		Long termId
) implements Serializable {}
