package com.collabothon.back.dto.profile;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/** The lesson mode the user switched to: {@code classic} (transcript) or {@code video}. */
public record LessonModeRequest(@NotNull @Pattern(regexp = "classic|video") String mode) {
}
