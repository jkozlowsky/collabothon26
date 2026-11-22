package com.collabothon.back.dto.profile;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import com.collabothon.back.profile.consts.ProfileConsts;

public record AvatarRequest(
		@NotNull
		@Pattern(regexp = ProfileConsts.AVATAR_PATTERN)
		String avatar) {}
