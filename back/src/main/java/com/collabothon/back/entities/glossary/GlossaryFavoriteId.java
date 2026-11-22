package com.collabothon.back.entities.glossary;

import java.io.Serializable;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import com.collabothon.back.common.consts.UserConsts;

@Embeddable
public record GlossaryFavoriteId(
		@Column(name = "user_id", nullable = false, length = UserConsts.MAX_USER_ID_LENGTH)
		String userId,
		@Column(name = "term_id", nullable = false)
		Long termId) implements Serializable {}
