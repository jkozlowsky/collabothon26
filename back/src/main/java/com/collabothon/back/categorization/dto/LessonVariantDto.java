package com.collabothon.back.categorization.dto;

import com.collabothon.back.categorization.enums.LessonLang;
import com.collabothon.back.categorization.enums.LessonLevel;
import com.collabothon.back.categorization.enums.LifeStage;

public record LessonVariantDto(
		LifeStage persona,
		LessonLevel level,
		LessonLang lang
) {}
