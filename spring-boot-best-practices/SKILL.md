---
name: spring-boot-best-practices
description: Best practices for developing and maintaining Spring Boot applications, covering architecture, configuration, performance, security, testing, and API documentation. Use this skill whenever working on Java/Spring Boot code.
---

# Spring Boot Best Practices

When writing, modifying, or refactoring Spring Boot applications, always adhere to the following best practices to ensure the code is professional, scalable, secure, and maintainable. 

Because Spring Boot covers a wide array of topics, these guidelines have been split into detailed reference documents. **You must review the appropriate reference file when working on a specific layer of the application.**

**Scope:** these rules describe the `api` module (package `pl.lodz.p.it.ssbd2026.ssbd01`). Other modules have their own conventions: `auth-service-1`, for example, uses `FooService` + `FooServiceImpl`. When working in another module, follow that module's existing style instead.

## Detailed Guidelines

### [Architecture & Design](references/architecture.md)
* Package Structure
* API Design & DTOs
* Dependency Injection (Constructor Injection)
* Global Exception Handling (`@ControllerAdvice`)
* **Current user, roles & other services** — UUID users, `SecurityUtils`, subject roles, service clients
* **Java Code Style** — no inline fully-qualified names, no ternaries, pure MapStruct mappers, guard clauses

### [API Documentation (OpenAPI)](references/openapi.md)
* Setup with `springdoc-openapi`
* Code-First Documentation & JSR-303 Validation
* Annotating Controllers and Responses (`@Operation`, `@ApiResponse`, `@Tag`)
* Expanding Objects (`@ParameterObject`)

### [Data Access & Performance](references/data-access.md)
* Optimizing JPA/Hibernate (Avoiding N+1, Projections)
* Database Migrations (Flyway/Liquibase)
* Caching Strategies
* Connection Pooling & Observability

### [Advanced Testing](references/testing.md)
* The Test Pyramid & Test Slices (`@WebMvcTest`, `@DataJpaTest`)
* Integration Testing with **Testcontainers**
* Authenticated requests in tests (`JwtTestUtils`, `mockAuthenticatedUser`)
* Mocking Strategies (`@MockitoBean`, `@MockitoSpyBean`)
* Avoiding Context Reloads (`@DirtiesContext`)

## General Rules
1. **Always Externalize Configuration:** Put config in `infra/base/config-repo/<module>.properties`, not the module's local `application.properties`. Kustomize packs those files into the `app-config-files` ConfigMap, mounted in the pod as `application.properties`. Read values with type-safe `@ConfigurationProperties`. The Spring Cloud Config Server has been removed.
2. **Prioritize Security:** Validate input (`@Valid`) and prevent SQL injection. Authentication is stateless: `auth-service-1` issues the JWT and `api` only validates it; never add login, password or account logic to `api`.
3. **Keep Dependencies Updated:** Ensure the Spring Boot version and its dependencies remain up-to-date.
4. **SonarQube Compliance:** The project uses SonarQube to check code quality. Always follow common Java and Spring Boot code guidelines to ensure code passes quality gates.
