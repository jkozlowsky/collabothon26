package com.collabothon.back.glossary;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.collabothon.back.lesson.Lesson;

@RestController
@RequestMapping("/api/glossary")
class GlossaryController {

	private final GlossaryCategoryRepository categories;

	private final GlossaryTermRepository terms;

	GlossaryController(GlossaryCategoryRepository categories, GlossaryTermRepository terms) {
		this.categories = categories;
		this.terms = terms;
	}

	/** All categories that have at least one term, each with its terms in display order. */
	@GetMapping
	List<CategoryDto> list() {
		return categories.findAllByOrderByPosition()
			.stream()
			.filter(c -> !c.getTerms().isEmpty())
			.map(CategoryDto::from)
			.toList();
	}

	@GetMapping("/terms/{slug}")
	TermDetail get(@PathVariable String slug) {
		return terms.findBySlug(slug)
			.map(TermDetail::from)
			.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
	}

	record CategoryDto(String slug, String name, List<TermSummary> terms) {
		static CategoryDto from(GlossaryCategory c) {
			return new CategoryDto(c.getSlug(), c.getName(), c.getTerms().stream().map(TermSummary::from).toList());
		}
	}

	record TermSummary(String slug, String name, String shortDescription) {
		static TermSummary from(GlossaryTerm t) {
			return new TermSummary(t.getSlug(), t.getName(), t.getShortDescription());
		}
	}

	/**
	 * definitionPlain is null until the "in plain words" version exists; the definitions contain
	 * [[slug|text]] links to other terms. lesson is the lesson to practise this term in, or null.
	 */
	record TermDetail(String slug, String name, String fullName, CategoryRef category, String definitionStandard,
			String definitionPlain, String example, String graphicKey, List<TermRef> related, LessonRef lesson) {
		static TermDetail from(GlossaryTerm t) {
			Lesson l = t.getLesson();
			return new TermDetail(t.getSlug(), t.getName(), t.getFullName(),
					new CategoryRef(t.getCategory().getSlug(), t.getCategory().getName()), t.getDefinitionStandard(),
					t.getDefinitionPlain(), t.getExample(), t.getGraphicKey(),
					t.getRelated().stream().map(r -> new TermRef(r.getSlug(), r.getName())).toList(),
					l == null ? null : new LessonRef(l.getId(), l.getTitle()));
		}
	}

	record CategoryRef(String slug, String name) {
	}

	record TermRef(String slug, String name) {
	}

	record LessonRef(Long id, String title) {
	}

}
