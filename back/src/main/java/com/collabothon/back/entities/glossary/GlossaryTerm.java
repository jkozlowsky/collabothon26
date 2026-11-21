package com.collabothon.back.entities.glossary;

import java.util.List;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "glossary_term")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GlossaryTerm {

	@Id
	@Column(name = "id", nullable = false)
	private Long id;

	@Column(name = "slug", nullable = false, length = 60, unique = true)
	private String slug;

	@Column(name = "name", nullable = false, length = 80)
	private String name;

	@Column(name = "full_name", length = 120)
	private String fullName;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "category_id", nullable = false)
	private GlossaryCategory category;

	@Column(name = "position", nullable = false)
	private int position;

	@Column(name = "short_description", nullable = false, length = 160)
	private String shortDescription;

	@Column(name = "definition_standard", nullable = false, columnDefinition = "TEXT")
	private String definitionStandard;

	@Column(name = "example", columnDefinition = "TEXT")
	private String example;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(name = "aliases", nullable = false)
	private List<String> aliases;

	@Column(name = "graphic_key", length = 40)
	private String graphicKey;

	@ManyToMany
	@JoinTable(name = "glossary_related", joinColumns = @JoinColumn(name = "term_id"),
			inverseJoinColumns = @JoinColumn(name = "related_term_id"))
	@OrderColumn(name = "position")
	private List<GlossaryTerm> related;

	@Builder
	public GlossaryTerm(Long id, String slug, String name, String fullName, GlossaryCategory category,
			int position, String shortDescription, String definitionStandard,
			String example, List<String> aliases, String graphicKey, List<GlossaryTerm> related) {
		this.id = id;
		this.slug = slug;
		this.name = name;
		this.fullName = fullName;
		this.category = category;
		this.position = position;
		this.shortDescription = shortDescription;
		this.definitionStandard = definitionStandard;
		this.example = example;
		this.aliases = aliases;
		this.graphicKey = graphicKey;
		this.related = related;
	}
}
