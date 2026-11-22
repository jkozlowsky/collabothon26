package com.collabothon.back.categorization.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import com.collabothon.back.common.consts.UserConsts;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "categorization")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Categorization {

	@Id
	@Column(name = "user_id", nullable = false, length = UserConsts.MAX_USER_ID_LENGTH)
	private String userId;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "data", nullable = false)
	private String data;

}
