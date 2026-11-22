package com.collabothon.back.dto.profile;

import java.util.List;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import com.collabothon.back.lesson.consts.LessonConsts;
import com.collabothon.back.profile.consts.ProfileConsts;

public record OnboardingRequest(
		@Pattern(regexp = ProfileConsts.LIFE_STAGE_PATTERN)
		String lifeStage,
		@NotNull
		@Size(max = ProfileConsts.MAX_INTERESTS)
		List<@NotNull @Size(max = LessonConsts.MAX_ID_LENGTH) String> interests,
		@Pattern(regexp = ProfileConsts.EXPERIENCE_PATTERN)
		String experience,
		boolean skipped) {}
