package com.collabothon.back.glossary;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Transactional;

import com.collabothon.back.TestcontainersConfiguration;

/**
 * Guards the seeded content: a broken [[link]] would otherwise only show up as a dead word on a phone.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@Transactional
class GlossaryContentTests {

	private static final Pattern LINK = Pattern.compile("\\[\\[([^\\]|]*)(?:\\|([^\\]]*))?\\]\\]");

	private static final Set<String> GRAPHICS = Set.of("compound-growth", "diversification", "inflation-power");

	@Autowired
	GlossaryTermRepository terms;

	@Test
	void everyInlineLinkPointsToAnExistingTerm() {
		Set<String> slugs = terms.findAll().stream().map(GlossaryTerm::getSlug).collect(Collectors.toSet());
		for (GlossaryTerm t : terms.findAll()) {
			for (String text : new String[] { t.getDefinitionStandard(), t.getDefinitionPlain() }) {
				if (text == null) {
					continue;
				}
				Matcher m = LINK.matcher(text);
				while (m.find()) {
					assertThat(slugs).as("link [[%s]] in '%s'", m.group(1), t.getSlug()).contains(m.group(1));
					assertThat(m.group(1)).as("term must not link to itself: %s", t.getSlug()).isNotEqualTo(t.getSlug());
				}
				assertThat(text.replaceAll(LINK.pattern(), "")).as("stray brackets in '%s'", t.getSlug())
					.doesNotContain("[[")
					.doesNotContain("]]");
			}
		}
	}

	@Test
	void relatedTermsAreOrderedAndNeverContainTheTermItself() {
		for (GlossaryTerm t : terms.findAll()) {
			List<GlossaryTerm> related = t.getRelated();
			assertThat(related).as("related of '%s'", t.getSlug()).doesNotContainNull().doesNotContain(t);
		}
	}

	@Test
	void graphicKeysAreKnown() {
		for (GlossaryTerm t : terms.findAll()) {
			if (t.getGraphicKey() != null) {
				assertThat(GRAPHICS).as("graphic of '%s'", t.getSlug()).contains(t.getGraphicKey());
			}
		}
	}

}
