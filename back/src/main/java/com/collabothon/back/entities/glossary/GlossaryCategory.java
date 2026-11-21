package com.collabothon.back.entities.glossary;

import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "glossary_category")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GlossaryCategory {

	@Id
	@Column(name = "id", nullable = false)
	private Long id;

	@Column(name = "slug", nullable = false, length = 40, unique = true)
	private String slug;

	@Column(name = "name", nullable = false, length = 60)
	private String name;

	@Column(name = "position", nullable = false)
	private int position;

	@OneToMany(mappedBy = "category")
	@OrderBy("position")
	private List<GlossaryTerm> terms;

	@Builder
	public GlossaryCategory(Long id, String slug, String name, int position, List<GlossaryTerm> terms) {
		this.id = id;
		this.slug = slug;
		this.name = name;
		this.position = position;
		this.terms = terms;
	}
}
