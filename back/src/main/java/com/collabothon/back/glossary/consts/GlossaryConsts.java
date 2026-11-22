package com.collabothon.back.glossary.consts;

import java.util.regex.Pattern;

public final class GlossaryConsts {

	public static final String CONTENT_PATH = "content/glossary.json";

	public static final int CATEGORY_BATCH_SIZE = 20;

	public static final int MAX_SLUG_LENGTH = 60;
	public static final int MAX_QUERY_LENGTH = 64;
	public static final int MAX_HITS = 20;
	public static final int MAX_DEFINITION_MATCHES = 50;
	public static final int MAX_MENTIONS = 5;
	public static final int MAX_SUGGESTIONS = 3;
	public static final double MIN_SIMILARITY = 0.3;

	public static final int SNIPPET_CONTEXT = 30;
	public static final String ELLIPSIS = "…";

	// [[slug]] or [[slug|label]]
	public static final Pattern LINK = Pattern.compile("\\[\\[([^\\]|]*)(?:\\|([^\\]]*))?\\]\\]");

}
