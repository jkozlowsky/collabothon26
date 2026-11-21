package com.collabothon.back.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Lets the Expo web dev server (different port = different origin) call the API. */
@Configuration
class CorsConfig implements WebMvcConfigurer {

	private final String[] allowedOrigins;

	CorsConfig(@Value("${app.cors.allowed-origins}") String[] allowedOrigins) {
		this.allowedOrigins = allowedOrigins;
	}

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		registry.addMapping("/api/**").allowedOrigins(allowedOrigins).allowedMethods("*");
		// Lesson narration (static/audio), played by the web build straight from the backend when EXPO_PUBLIC_API_URL is set.
		registry.addMapping("/audio/**").allowedOrigins(allowedOrigins).allowedMethods("GET", "HEAD");
	}

}
