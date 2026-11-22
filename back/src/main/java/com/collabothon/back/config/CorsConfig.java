package com.collabothon.back.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.collabothon.back.common.consts.WebConsts;

import lombok.RequiredArgsConstructor;

// The web build runs on another origin. Enabled explicitly, because @WebMvcTest does not scan properties records.
@Configuration
@EnableConfigurationProperties(CorsProperties.class)
@RequiredArgsConstructor
class CorsConfig implements WebMvcConfigurer {

	private final CorsProperties properties;

	@Override
	public void addCorsMappings(CorsRegistry registry) {
		String[] origins = properties.allowedOrigins();
		registry.addMapping(WebConsts.API_PATHS).allowedOrigins(origins).allowedMethods(CorsConfiguration.ALL);
		// The web build plays the narration in static/audio straight from the backend.
		registry.addMapping(WebConsts.AUDIO_PATHS)
			.allowedOrigins(origins)
			.allowedMethods(HttpMethod.GET.name(), HttpMethod.HEAD.name());
	}

}
