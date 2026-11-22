package com.collabothon.back.glossary.services;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.MatchResult;
import java.util.regex.Matcher;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.dto.converters.glossary.GlossaryMapper;
import com.collabothon.back.dto.glossary.Mention;
import com.collabothon.back.dto.glossary.SearchResult;
import com.collabothon.back.entities.glossary.GlossaryTerm;
import com.collabothon.back.glossary.consts.GlossaryConsts;
import com.collabothon.back.glossary.repositories.GlossaryTermRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GlossarySearchService {

	private final GlossaryTermRepository terms;
	private final GlossaryMapper glossaryMapper;

	@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
	public SearchResult search(String rawQuery) {
		String query = rawQuery.strip().toLowerCase(Locale.ROOT);
		List<GlossaryTerm> hits = terms.searchByName(query, GlossaryConsts.MAX_HITS);
		List<Mention> mentions = mentions(query, hits);
		List<GlossaryTerm> suggestions = suggestions(query, hits);
		return new SearchResult(glossaryMapper.toTermHits(hits), mentions, glossaryMapper.toTermHits(suggestions));
	}

	private List<Mention> mentions(String query, List<GlossaryTerm> hits) {
		Set<String> hitSlugs = hits.stream().map(GlossaryTerm::getSlug).collect(Collectors.toSet());
		return terms.findDefinitionsContaining(query, GlossaryConsts.MAX_DEFINITION_MATCHES)
			.stream()
			.filter(term -> !hitSlugs.contains(term.getSlug()))
			.flatMap(term -> snippet(withoutMarkup(term.getDefinitionStandard()), query)
				.map(snippet -> glossaryMapper.toMention(term, snippet))
				.stream())
			.limit(GlossaryConsts.MAX_MENTIONS)
			.toList();
	}

	private List<GlossaryTerm> suggestions(String query, List<GlossaryTerm> hits) {
		if (!hits.isEmpty()) {
			return List.of();
		}
		return terms.findSimilarByName(query, GlossaryConsts.MIN_SIMILARITY, GlossaryConsts.MAX_SUGGESTIONS);
	}

	private static String withoutMarkup(String definition) {
		return GlossaryConsts.LINK.matcher(definition).replaceAll(link -> Matcher.quoteReplacement(linkText(link)));
	}

	private static String linkText(MatchResult link) {
		String label = link.group(2);
		if (label != null && !label.isBlank()) {
			return label;
		}
		return link.group(1);
	}

	private static Optional<String> snippet(String text, String query) {
		int matchStart = text.toLowerCase(Locale.ROOT).indexOf(query);
		if (matchStart < 0) {
			return Optional.empty();
		}
		int from = snippetStart(text, matchStart);
		int to = snippetEnd(text, matchStart + query.length());
		String snippet = text.substring(from, to).strip();
		if (from > 0) {
			snippet = GlossaryConsts.ELLIPSIS + snippet;
		}
		if (to < text.length()) {
			snippet += GlossaryConsts.ELLIPSIS;
		}
		return Optional.of(snippet);
	}

	private static int snippetStart(String text, int matchStart) {
		int from = matchStart - GlossaryConsts.SNIPPET_CONTEXT;
		if (from <= 0) {
			return 0;
		}
		int space = text.indexOf(' ', from);
		if (space >= 0 && space < matchStart) {
			return space + 1;
		}
		return from;
	}

	private static int snippetEnd(String text, int matchEnd) {
		int to = matchEnd + GlossaryConsts.SNIPPET_CONTEXT;
		if (to >= text.length()) {
			return text.length();
		}
		int space = text.lastIndexOf(' ', to);
		if (space > matchEnd) {
			return space;
		}
		return to;
	}

}
