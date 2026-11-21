package com.collabothon.back.categorization.entities;

import java.util.List;

import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;

import com.collabothon.back.categorization.enums.FocusArea;
import com.collabothon.back.categorization.enums.QuestionLevel;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** The bank is written by migrations; the builder makes tests' own rows. {@code correctIndex} is 0-based. */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder(toBuilder = true)
public class CheckQuestion {

	@Id
	private String id;

	private String lessonId;

	@Convert(converter = FocusAreaConverter.class)
	private FocusArea area;

	@Convert(converter = QuestionLevelConverter.class)
	private QuestionLevel level;

	private String accountPrompt;

	private List<String> slots;

	private String genericPrompt;

	private List<String> options;

	private int correctIndex;

	private List<String> misconceptions;

	private String checks;

}
