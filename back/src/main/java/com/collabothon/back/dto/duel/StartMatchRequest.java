package com.collabothon.back.dto.duel;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import com.collabothon.back.common.validation.UserId;
import com.collabothon.back.duel.consts.DuelConsts;
import com.collabothon.back.entities.duel.DuelMode;

public record StartMatchRequest(
		@UserId
		String userId,
		@NotEmpty
		@Size(max = DuelConsts.MAX_CATEGORIES)
		List<@NotBlank String> categories,
		@NotNull
		DuelMode mode
) {}
