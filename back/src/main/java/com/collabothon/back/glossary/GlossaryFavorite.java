package com.collabothon.back.glossary;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@IdClass(GlossaryFavoriteId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class GlossaryFavorite {

	@Id
	private String userId;

	@Id
	private Long termId;

	@Column(insertable = false, updatable = false)
	private Instant createdAt;

}
