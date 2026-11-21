package com.collabothon.back.dto.glossary;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record PreferenceRequest(@NotNull @Pattern(regexp = "plain|standard") String languageLevel) {
}
