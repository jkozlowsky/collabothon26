package com.collabothon.back.glossary;

import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;


/** One glossary entry. Definitions contain inline links written as [[slug|visible text]]. */
@Entity
public class GlossaryTerm {

	@Id
	private Long id;

	private String slug;

	private String name;

	private String fullName;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "category_id")
	private GlossaryCategory category;

	private int position;

	private String shortDescription;

	private String definitionStandard;

	/** Null until the "in plain words" version has been written. */
	private String definitionPlain;

	private String example;

	/** Postgres text[]; synonyms matched by search. */
	private List<String> aliases;

	private String graphicKey;

	@ManyToMany
	@JoinTable(name = "glossary_related", joinColumns = @JoinColumn(name = "term_id"),
			inverseJoinColumns = @JoinColumn(name = "related_term_id"))
	@OrderColumn(name = "position")
	private List<GlossaryTerm> related;

	protected GlossaryTerm() {
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

	public String getFullName() {
		return fullName;
	}

	public GlossaryCategory getCategory() {
		return category;
	}

	public int getPosition() {
		return position;
	}

	public String getShortDescription() {
		return shortDescription;
	}

	public String getDefinitionStandard() {
		return definitionStandard;
	}

	public String getDefinitionPlain() {
		return definitionPlain;
	}

	public String getExample() {
		return example;
	}

	public List<String> getAliases() {
		return aliases;
	}

	public String getGraphicKey() {
		return graphicKey;
	}

	public List<GlossaryTerm> getRelated() {
		return related;
	}

}
