package com.collabothon.back.categorization.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** One row per user; {@code data} is the serialised {@code CategorizationDto} without {@code startHere}. */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Categorization {

	@Id
	private String userId;

	@JdbcTypeCode(SqlTypes.JSON)
	private String data;

}
