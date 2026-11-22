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

// Reads a JSON block that a spec marks with <!-- marker ... -->, so tests pin the verbatim text.
final class SpecBlocks {

	static final String F1 = "docs/specs/F1-profiling.md";

	static final String F1B = "docs/specs/F1b-quick-check.md";

	static JsonNode read(JsonMapper json, String marker) throws IOException {
		return read(json, F1B, marker);
	}

	static JsonNode read(JsonMapper json, String spec, String marker) throws IOException {
		Path dir = Path.of(System.getProperty("user.dir")).toAbsolutePath();
		while (!Files.exists(dir.resolve(spec))) {
			dir = dir.getParent();
			assertNotNull(dir, spec + " above the working directory");
		}
		Matcher block = Pattern.compile("<!-- " + marker + "[^>]*-->\n```json\n(.*?)\n```", Pattern.DOTALL)
			.matcher(Files.readString(dir.resolve(spec)));
		assertTrue(block.find(), marker);
		return json.readTree(block.group(1));
	}

}
