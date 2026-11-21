package com.collabothon.back.config;

import java.util.Random;
import java.util.random.RandomGenerator;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class RandomConfig {

	// java.util.Random is safe to share between request threads; tests replace the bean to fix a draw.
	@Bean
	RandomGenerator random() {
		return new Random();
	}

}
