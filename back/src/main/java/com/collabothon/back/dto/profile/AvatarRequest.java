package com.collabothon.back.dto.profile;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record AvatarRequest(@NotNull @Pattern(regexp = "[mf][1-3]") String avatar) {
}
