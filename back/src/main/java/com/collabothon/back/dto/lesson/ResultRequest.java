package com.collabothon.back.dto.lesson;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import com.collabothon.back.lesson.validation.CompletionDay;
import com.collabothon.back.profile.consts.ProfileConsts;

public record ResultRequest(
		@NotNull
		List<@NotNull @Valid StepResult> steps,
		Map<String, Integer> scenarioChoices,
		@NotNull
		@Pattern(regexp = ProfileConsts.LESSON_MODE_PATTERN)
		String mode,
		@CompletionDay
		LocalDate completedOn) {}
