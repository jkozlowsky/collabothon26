package com.collabothon.back.categorization.entities;

import java.util.List;

import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;

import com.collabothon.back.categorization.enums.CheckCategory;
import com.collabothon.back.categorization.enums.FocusArea;

import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CheckQuestion {

	@Id
	private String id;

	@Convert(converter = CheckCategoryConverter.class)
	private CheckCategory category;

	@Convert(converter = FocusAreaConverter.class)
	private FocusArea area;

	private Long lessonId;

	private String accountPrompt;

	private List<String> slots;

	private String genericPrompt;

	private String criterion;

}
