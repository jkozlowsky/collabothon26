package com.collabothon.back.categorization.config;

import static com.collabothon.back.categorization.consts.JevConsts.API_KEY_PATTERN;
import static com.collabothon.back.categorization.consts.JevConsts.DEFAULT_BASE_URL;
import static com.collabothon.back.categorization.consts.JevConsts.DEFAULT_MODEL;
import static com.collabothon.back.categorization.consts.JevConsts.LOOPBACK_HOSTS;
import static com.collabothon.back.categorization.consts.JevConsts.MAX_PORT;
import static com.collabothon.back.categorization.consts.JevConsts.MIN_PORT;
import static com.collabothon.back.categorization.consts.JevConsts.NO_PORT;
import static com.collabothon.back.categorization.consts.JevConsts.WEB_SCHEMES;

import java.net.URI;
import java.util.Locale;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties("jev")
@Validated
public record JevProperties(
		@NotNull
		@DefaultValue(DEFAULT_BASE_URL)
		URI baseUrl,
		@Pattern(regexp = API_KEY_PATTERN, message = "jev.api-key must be printable ASCII without spaces")
		@DefaultValue("")
		String apiKey,
		@NotBlank
		@DefaultValue(DEFAULT_MODEL)
		String model
) {

	private static final String DEFAULT_HOST = URI.create(DEFAULT_BASE_URL).getHost();

	public JevProperties {
		apiKey = apiKey == null ? "" : apiKey.strip();
	}

	/** The hosted API without a key would only answer 401, so that call is skipped. */
	public boolean callsJev() {
		return !apiKey.isEmpty() || !DEFAULT_HOST.equalsIgnoreCase(baseUrl.getHost());
	}

	@AssertTrue(message = "jev.base-url must be an absolute http(s) URL with a port in 1-65535")
	boolean isWebUrl() {
		return baseUrl == null || (baseUrl.getScheme() != null
				&& WEB_SCHEMES.contains(baseUrl.getScheme().toLowerCase(Locale.ROOT)) && baseUrl.getHost() != null
				&& (baseUrl.getPort() == NO_PORT || (baseUrl.getPort() >= MIN_PORT && baseUrl.getPort() <= MAX_PORT)));
	}

	@AssertTrue(message = "jev.api-key is only sent over https, or over http to localhost")
	boolean isKeySentSafely() {
		return apiKey.isEmpty() || baseUrl == null || "https".equalsIgnoreCase(baseUrl.getScheme())
				|| (baseUrl.getHost() != null && LOOPBACK_HOSTS.contains(baseUrl.getHost().toLowerCase(Locale.ROOT)));
	}

}
