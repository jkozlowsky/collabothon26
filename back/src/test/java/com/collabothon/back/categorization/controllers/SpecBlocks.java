package com.collabothon.back.categorization.controllers;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Reads a JSON block that the F1b spec marks with {@code <!-- marker ... -->}, so tests pin the verbatim text. */
final class SpecBlocks {

	private static final String SPEC = "docs/specs/F1b-quick-check.md";

	static JsonNode read(JsonMapper json, String marker) throws IOException {
		Path dir = Path.of(System.getProperty("user.dir")).toAbsolutePath();
		while (!Files.exists(dir.resolve(SPEC))) {
			dir = dir.getParent();
			assertNotNull(dir, SPEC + " above the working directory");
		}
		Matcher block = Pattern.compile("<!-- " + marker + "[^>]*-->\n```json\n(.*?)\n```", Pattern.DOTALL)
			.matcher(Files.readString(dir.resolve(SPEC)));
		assertTrue(block.find(), marker);
		return json.readTree(block.group(1));
	}

}
