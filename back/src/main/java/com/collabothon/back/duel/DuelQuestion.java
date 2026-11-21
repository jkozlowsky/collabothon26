package com.collabothon.back.duel;

import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Bilingual multiple-choice question; options are stored in their original, unshuffled order. */
@Entity
@Table(name = "duel_question")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PACKAGE)
class DuelQuestion {

	enum Difficulty {

		EASY, MEDIUM, HARD

	}

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "category_id", nullable = false)
	private Long categoryId;

	@Enumerated(EnumType.STRING)
	@Column(length = 8, nullable = false)
	private Difficulty difficulty;

	@Column(name = "prompt_en", nullable = false)
	private String promptEn;

	@Column(name = "prompt_pl", nullable = false)
	private String promptPl;

	@Column(name = "options_en", nullable = false)
	private List<String> optionsEn;

	@Column(name = "options_pl", nullable = false)
	private List<String> optionsPl;

	@Column(name = "correct_index", nullable = false)
	private int correctIndex;

	@Column(name = "explanation_en", nullable = false)
	private String explanationEn;

	@Column(name = "explanation_pl", nullable = false)
	private String explanationPl;

	String getPrompt(DuelLang lang) {
		return lang == DuelLang.PL ? promptPl : promptEn;
	}

	List<String> getOptions(DuelLang lang) {
		return lang == DuelLang.PL ? optionsPl : optionsEn;
	}

	String getExplanation(DuelLang lang) {
		return lang == DuelLang.PL ? explanationPl : explanationEn;
	}

}
