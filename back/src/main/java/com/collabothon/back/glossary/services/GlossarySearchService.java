package com.collabothon.back.glossary.services;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.dto.converters.glossary.GlossaryMapper;
import com.collabothon.back.dto.glossary.Mention;
import com.collabothon.back.dto.glossary.SearchResult;
import com.collabothon.back.dto.glossary.TermHit;
import com.collabothon.back.entities.glossary.GlossaryTerm;
import com.collabothon.back.exceptions.BusinessException;
import com.collabothon.back.glossary.repositories.GlossaryTermRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GlossarySearchService {

	private static final Pattern LINK = Pattern.compile("\\[\\[([^\\]|]*)(?:\\|([^\\]]*))?\\]\\]");

	private static final int MAX_QUERY_LENGTH = 64;
	private static final int MAX_MENTIONS = 5;
	private static final int SNIPPET_CONTEXT = 30;

	private final GlossaryTermRepository terms;
	private final GlossaryMapper glossaryMapper;

	@Transactional(readOnly = true, propagation = Propagation.REQUIRED)
	public SearchResult search(String q) {
		if (q == null) {
			throw new BusinessException(GlossaryErrorCode.INVALID_QUERY);
		}
		String query = q.strip().toLowerCase(Locale.ROOT);
		if (query.isEmpty() || query.length() > MAX_QUERY_LENGTH) {
			throw new BusinessException(GlossaryErrorCode.INVALID_QUERY);
		}

		List<GlossaryTerm> hits = terms.searchByName(query);
		Set<String> hitSlugs = hits.stream().map(GlossaryTerm::getSlug).collect(Collectors.toSet());
		List<Mention> mentions = terms.findDefinitionsContaining(query)
				.stream()
				.filter(t -> !hitSlugs.contains(t.getSlug()))
				.map(t -> toMention(t, query))
				.flatMap(Optional::stream)
				.limit(MAX_MENTIONS)
				.toList();

		List<GlossaryTerm> similar;
		if (hits.isEmpty()) {
			similar = terms.findSimilarByName(query);
		}
		else {
			similar = List.of();
		}

		List<TermHit> termHits = hits.stream().map(glossaryMapper::toTermHit).toList();
		List<TermHit> suggestionHits = similar.stream().map(glossaryMapper::toTermHit).toList();
		return new SearchResult(termHits, mentions, suggestionHits);
	}

	/** The part of the definition that mentions the query, as a snippet around the match. */
	private static Optional<Mention> toMention(GlossaryTerm t, String query) {
		return snippet(withoutMarkup(t.getDefinitionStandard()), query)
				.map(snippet -> new Mention(t.getSlug(), t.getName(), snippet));
	}

	/** Replaces {@code [[slug|label]]} links with their label (or slug). */
	private static String withoutMarkup(String definition) {
		return LINK.matcher(definition).replaceAll(m -> {
			String label = m.group(2);
			if (label != null && !label.isBlank()) {
				return Matcher.quoteReplacement(label);
			}
			return Matcher.quoteReplacement(m.group(1));
		});
	}

	/** The match with about 30 characters of context on each side, cut at word boundaries. */
	private static Optional<String> snippet(String text, String query) {
		int at = text.toLowerCase(Locale.ROOT).indexOf(query);
		if (at < 0) {
			return Optional.empty();
		}
		int from = Math.max(0, at - SNIPPET_CONTEXT);
		int to = Math.min(text.length(), at + query.length() + SNIPPET_CONTEXT);
		if (from > 0) {
			int space = text.indexOf(' ', from);
			if (space >= 0 && space < at) {
				from = space + 1;
			}
		}
		if (to < text.length()) {
			int space = text.lastIndexOf(' ', to);
			if (space > at + query.length()) {
				to = space;
			}
		}

		StringBuilder sb = new StringBuilder();
		if (from > 0) {
			sb.append("…");
		}
		sb.append(text.substring(from, to).strip());
		if (to < text.length()) {
			sb.append("…");
		}
		return Optional.of(sb.toString());
	}
}
