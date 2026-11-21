package com.collabothon.back.dto.lesson;

import jakarta.validation.constraints.NotBlank;

public record StepResult(@NotBlank String stepId, boolean correctFirstTry) {
}
