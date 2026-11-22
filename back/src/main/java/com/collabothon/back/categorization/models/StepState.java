package com.collabothon.back.categorization.models;

import java.util.List;

public record StepState(
		List<CheckQuestion> pool,
		List<CheckQuestion> open,
		Measurement measurement
) {}
