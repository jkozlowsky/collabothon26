package com.collabothon.back.dto.duel;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.collabothon.back.entities.duel.DuelMode;

public record StartMatchRequest(
		@NotBlank @Size(max = 64) String userId,
		@NotEmpty List<@NotBlank String> categories,
		@NotNull DuelMode mode
) {
}
