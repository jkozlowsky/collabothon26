package com.collabothon.back.config;

import jakarta.validation.constraints.NotNull;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties("app.cors")
@Validated
public record CorsProperties(
		@NotNull
		String[] allowedOrigins) {}
