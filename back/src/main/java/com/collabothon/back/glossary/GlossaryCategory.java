package com.collabothon.back.glossary;

import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;

@Entity
public class GlossaryCategory {

	@Id
	private Long id;

	private String slug;

	private String name;

	private int position;

	@OneToMany(mappedBy = "category")
	@OrderBy("position")
	private List<GlossaryTerm> terms;

	protected GlossaryCategory() {
	}

	public Long getId() {
		return id;
	}

	public String getSlug() {
		return slug;
	}

	public String getName() {
		return name;
	}

	public int getPosition() {
		return position;
	}

	public List<GlossaryTerm> getTerms() {
		return terms;
	}

}
