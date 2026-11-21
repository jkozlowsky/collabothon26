package com.collabothon.back.categorization.config;

import java.net.http.HttpClient;

import org.springframework.boot.http.client.JdkClientHttpRequestFactoryBuilder;
import org.springframework.boot.http.client.autoconfigure.ClientHttpRequestFactoryBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class JevHttpClientConfig {

	@Bean
	ClientHttpRequestFactoryBuilderCustomizer<JdkClientHttpRequestFactoryBuilder> jevClientRedirectCustomizer() {
		return builder -> builder.withHttpClientCustomizer(client -> client.followRedirects(HttpClient.Redirect.NEVER));
	}

}
