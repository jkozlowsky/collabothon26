package com.collabothon.back.categorization;

import java.net.URI;
import java.util.Locale;
import java.util.Set;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

import com.collabothon.back.categorization.consts.JevConsts;

@ConfigurationProperties("jev")
@Validated
public record JevProperties(
		@NotNull @DefaultValue(JevConsts.DEFAULT_BASE_URL) URI baseUrl,
		@Pattern(regexp = "[\\x21-\\x7E]*", message = "jev.api-key must be printable ASCII without spaces")
		@DefaultValue("") String apiKey,
		@NotBlank @DefaultValue(JevConsts.DEFAULT_MODEL) String model) {

	private static final String DEFAULT_HOST = URI.create(JevConsts.DEFAULT_BASE_URL).getHost();

	private static final int NO_PORT = -1;

	private static final int MIN_PORT = 1;

	private static final int MAX_PORT = 65_535;

	private static final Set<String> WEB_SCHEMES = Set.of("http", "https");

	private static final Set<String> LOOPBACK_HOSTS = Set.of("localhost", "127.0.0.1", "[::1]");

	public JevProperties {
		apiKey = apiKey == null ? "" : apiKey.strip();
	}

	/** The hosted API without a key would only answer 401, so that call is skipped. */
	boolean callsJev() {
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
