package com.collabothon.back.entities.glossary;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "glossary_favorite")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class GlossaryFavorite {

	@EmbeddedId
	private GlossaryFavoriteId id;

	@Column(name = "created_at", nullable = false)
	private Instant createdAt;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "term_id", insertable = false, updatable = false)
	private GlossaryTerm term;

}
