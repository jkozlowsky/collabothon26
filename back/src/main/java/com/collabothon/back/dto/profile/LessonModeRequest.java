package com.collabothon.back.dto.profile;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import com.collabothon.back.profile.consts.ProfileConsts;

public record LessonModeRequest(
		@NotNull
		@Pattern(regexp = ProfileConsts.LESSON_MODE_PATTERN)
		String mode) {}
