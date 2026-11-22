package com.collabothon.back.categorization.config;

import static com.collabothon.back.categorization.consts.JevConsts.API_KEY_PATTERN;
import static com.collabothon.back.categorization.consts.JevConsts.DEFAULT_BASE_URL;
import static com.collabothon.back.categorization.consts.JevConsts.DEFAULT_MODEL;
import static com.collabothon.back.categorization.consts.JevConsts.HTTPS;
import static com.collabothon.back.categorization.consts.JevConsts.LOOPBACK_HOSTS;
import static com.collabothon.back.categorization.consts.JevConsts.MAX_PORT;
import static com.collabothon.back.categorization.consts.JevConsts.MIN_PORT;
import static com.collabothon.back.categorization.consts.JevConsts.NO_PORT;
import static com.collabothon.back.categorization.consts.JevConsts.REDACTED_KEY;
import static com.collabothon.back.categorization.consts.JevConsts.WEB_SCHEMES;

import java.net.URI;
import java.util.Locale;
import java.util.Objects;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

@ConfigurationProperties("jev")
@Validated
public record JevProperties(
		@NotNull
		@DefaultValue(DEFAULT_BASE_URL)
		URI baseUrl,
		@DefaultValue("")
		String apiKey,
		@NotBlank
		@DefaultValue(DEFAULT_MODEL)
		String model
) {

	private static final String DEFAULT_HOST = URI.create(DEFAULT_BASE_URL).getHost();

	public JevProperties {
		apiKey = Objects.requireNonNullElse(apiKey, "").strip();
	}

	// The hosted API without a key would only answer 401, so that call is skipped.
	public boolean callsJev() {
		return !apiKey.isEmpty() || !DEFAULT_HOST.equalsIgnoreCase(baseUrl.getHost());
	}

	// Not a @Pattern on apiKey: Boot prints the rejected value when startup fails.
	@AssertTrue(message = "jev.api-key must be printable ASCII without spaces")
	boolean isApiKeyWellFormed() {
		return API_KEY_PATTERN.matcher(apiKey).matches();
	}

	@AssertTrue(message = "jev.base-url must be an absolute http(s) URL with a port in 1-65535")
	boolean isWebUrl() {
		if (baseUrl == null) {
			return true;
		}
		String scheme = baseUrl.getScheme();
		if (scheme == null || !WEB_SCHEMES.contains(scheme.toLowerCase(Locale.ROOT)) || baseUrl.getHost() == null) {
			return false;
		}
		int port = baseUrl.getPort();
		return port == NO_PORT || (port >= MIN_PORT && port <= MAX_PORT);
	}

	@AssertTrue(message = "jev.api-key is only sent over https, or over http to localhost")
	boolean isKeySentSafely() {
		if (apiKey.isEmpty() || baseUrl == null || HTTPS.equalsIgnoreCase(baseUrl.getScheme())) {
			return true;
		}
		String host = baseUrl.getHost();
		return host != null && LOOPBACK_HOSTS.contains(host.toLowerCase(Locale.ROOT));
	}

	@Override
	public String toString() {
		return "JevProperties[baseUrl=" + baseUrl + ", apiKey=" + REDACTED_KEY + ", model=" + model + "]";
	}

}
