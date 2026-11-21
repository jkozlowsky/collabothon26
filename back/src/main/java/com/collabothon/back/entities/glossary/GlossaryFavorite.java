package com.collabothon.back.entities.glossary;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
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

	@Builder
	public GlossaryFavorite(GlossaryFavoriteId id, Instant createdAt) {
		this.id = id;
		this.createdAt = createdAt;
	}

	@Embeddable
	@Getter
	@NoArgsConstructor(access = AccessLevel.PROTECTED)
	@AllArgsConstructor
	public static class GlossaryFavoriteId implements Serializable {

		@Column(name = "user_id", nullable = false, length = 64)
		private String userId;

		@Column(name = "term_id", nullable = false)
		private Long termId;

		@Override
		public boolean equals(Object o) {
			if (this == o) {
				return true;
			}
			if (o == null || getClass() != o.getClass()) {
				return false;
			}
			GlossaryFavoriteId that = (GlossaryFavoriteId) o;
			return Objects.equals(userId, that.userId) && Objects.equals(termId, that.termId);
		}

		@Override
		public int hashCode() {
			return Objects.hash(userId, termId);
		}
	}
}
