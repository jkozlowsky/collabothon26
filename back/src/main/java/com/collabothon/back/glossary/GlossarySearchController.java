package com.collabothon.back.glossary;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.collabothon.back.glossary.GlossaryController.CategoryRef;

@RestController
@RequestMapping("/api/glossary/search")
class GlossarySearchController {

	private static final Pattern LINK = Pattern.compile("\\[\\[([^\\]|]*)(?:\\|([^\\]]*))?\\]\\]");

	private static final int MAX_QUERY_LENGTH = 64;

	private static final int MAX_MENTIONS = 5;

	private static final int SNIPPET_CONTEXT = 30;

	private final GlossaryTermRepository terms;

	GlossarySearchController(GlossaryTermRepository terms) {
		this.terms = terms;
	}

	/**
	 * terms: name or alias matches. mentions: other terms whose definition contains the text.
	 * suggestions: only when terms is empty, similar names to cover typos.
	 */
	@GetMapping
	@Transactional(readOnly = true)
	SearchResult search(@RequestParam String q) {
		String query = q.strip().toLowerCase(Locale.ROOT);
		if (query.isEmpty() || query.length() > MAX_QUERY_LENGTH) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "q must be 1-" + MAX_QUERY_LENGTH + " characters");
		}
		List<GlossaryTerm> hits = terms.searchByName(query);
		Set<String> hitSlugs = hits.stream().map(GlossaryTerm::getSlug).collect(Collectors.toSet());
		List<Mention> mentions = terms.findDefinitionsContaining(query)
			.stream()
			.filter(t -> !hitSlugs.contains(t.getSlug()))
			.map(t -> toMention(t, query))
			.filter(m -> m != null)
			.limit(MAX_MENTIONS)
			.toList();
		List<GlossaryTerm> similar = hits.isEmpty() ? terms.findSimilarByName(query) : List.of();
		return new SearchResult(hits.stream().map(TermHit::from).toList(), mentions,
				similar.stream().map(TermHit::from).toList());
	}

	private static Mention toMention(GlossaryTerm t, String query) {
		// Search the text the user reads, not the [[slug|...]] markup.
		for (String definition : new String[] { t.getDefinitionStandard(), t.getDefinitionPlain() }) {
			if (definition == null) {
				continue;
			}
			String snippet = snippet(withoutMarkup(definition), query);
			if (snippet != null) {
				return new Mention(t.getSlug(), t.getName(), snippet);
			}
		}
		return null;
	}

	static String withoutMarkup(String definition) {
		return LINK.matcher(definition).replaceAll(m -> {
			String label = m.group(2);
			return Matcher.quoteReplacement(label != null && !label.isBlank() ? label : m.group(1));
		});
	}

	/** A short excerpt around the first match, cut at word boundaries, with … where text was dropped. */
	static String snippet(String text, String query) {
		int at = text.toLowerCase(Locale.ROOT).indexOf(query);
		if (at < 0) {
			return null;
		}
		int from = Math.max(0, at - SNIPPET_CONTEXT);
		int to = Math.min(text.length(), at + query.length() + SNIPPET_CONTEXT);
		if (from > 0) {
			int space = text.indexOf(' ', from);
			from = space >= 0 && space < at ? space + 1 : from;
		}
		if (to < text.length()) {
			int space = text.lastIndexOf(' ', to);
			to = space > at + query.length() ? space : to;
		}
		return (from > 0 ? "…" : "") + text.substring(from, to).strip() + (to < text.length() ? "…" : "");
	}

	record SearchResult(List<TermHit> terms, List<Mention> mentions, List<TermHit> suggestions) {
	}

	record TermHit(String slug, String name, CategoryRef category, String shortDescription) {
		static TermHit from(GlossaryTerm t) {
			return new TermHit(t.getSlug(), t.getName(),
					new CategoryRef(t.getCategory().getSlug(), t.getCategory().getName()), t.getShortDescription());
		}
	}

	record Mention(String slug, String name, String snippet) {
	}

}
