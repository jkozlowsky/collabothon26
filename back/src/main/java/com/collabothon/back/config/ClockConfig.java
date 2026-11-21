package com.collabothon.back.config;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.collabothon.back.common.consts.TimeConsts;

@Configuration(proxyBeanMethods = false)
class ClockConfig {

	@Bean
	Clock clock() {
		return Clock.system(TimeConsts.ZONE);
	}

}
