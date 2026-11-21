package com.collabothon.back.duel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "duel_category")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class DuelCategory {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(length = 32, nullable = false, unique = true)
	private String slug;

	@Column(name = "name_en", length = 100, nullable = false)
	private String nameEn;

	@Column(name = "name_pl", length = 100, nullable = false)
	private String namePl;

	@Column(length = 16, nullable = false)
	private String icon;

	@Column(nullable = false)
	private int position;

	String getName(DuelLang lang) {
		return lang == DuelLang.PL ? namePl : nameEn;
	}

}
