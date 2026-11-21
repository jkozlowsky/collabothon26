package com.collabothon.back.dto.profile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SessionRequest(
		@NotBlank
		@Size(max = 64)
		String deviceId
) {
}
