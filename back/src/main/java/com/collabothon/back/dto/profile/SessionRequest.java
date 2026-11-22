package com.collabothon.back.dto.profile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import com.collabothon.back.common.validation.NoNul;
import com.collabothon.back.profile.consts.ProfileConsts;

public record SessionRequest(
		@NotBlank
		@Size(max = ProfileConsts.MAX_DEVICE_ID_LENGTH)
		@NoNul
		String deviceId) {}
