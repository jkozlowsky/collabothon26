package com.collabothon.back;

import org.springframework.boot.SpringApplication;

/** Runs the app against a throwaway Testcontainers Postgres: ./mvnw spring-boot:test-run */
public class TestBackApplication {

	public static void main(String[] args) {
		SpringApplication.from(BackApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
