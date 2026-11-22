package com.collabothon.back.categorization.models;

import java.util.List;

import com.collabothon.back.categorization.dto.FactsDto;
import com.collabothon.back.categorization.dto.OnboardingAnswersDto;
import com.collabothon.back.categorization.enums.LifeStage;
import com.collabothon.back.lesson.models.Story;

// The life stage may come from the age band, so a "You said" line reads the onboarding answer instead.
public record Learner(
		OnboardingAnswersDto onboarding,
		FactsDto facts,
		List<Story> picked,
		LifeStage lifeStage,
		String savingsCover
) {}
