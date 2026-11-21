package com.collabothon.back.dto.lesson;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record ResultRequest(@NotNull List<@Valid StepResult> steps, Map<String, Integer> scenarioChoices,
		@NotNull @Pattern(regexp = "classic|video") String mode,
		LocalDate completedOn) {
}
