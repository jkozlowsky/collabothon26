# Spring Boot OpenAPI Documentation Best Practices

For modern Spring Boot applications (this project is on 4.x), **`springdoc-openapi`** is the standard library for generating OpenAPI 3 documentation. Do not use the obsolete SpringFox library.

## 1. Setup & Configuration
* **Dependency:** Use `springdoc-openapi-starter-webmvc-ui`.
* **Endpoints:** By default, Swagger UI is available at `/swagger-ui/index.html` and the raw OpenAPI JSON at `/v3/api-docs`.
* **Production Safety:** Disable Swagger UI and API docs in production environments unless explicitly required, using `springdoc.swagger-ui.enabled=false` and `springdoc.api-docs.enabled=false`.

## 2. Code-First Documentation
* **Single Source of Truth:** Treat your code as the primary source of truth. Let `springdoc-openapi` generate the documentation directly from your controllers, DTOs, and signatures.
* **JSR-303 Validation:** Rely on standard Bean Validation annotations (`@NotNull`, `@Size`, `@Min`, etc.). Springdoc automatically translates these into the OpenAPI schema, making your APIs self-documenting.

## 3. Enriching the Documentation
* **Document All Responses:** Use `@ApiResponse` to explicitly document both success (2xx) and error (4xx, 5xx) states. This is crucial for API consumers to understand failure modes.
* **Secured Endpoints:** Always use the custom `@ApiSecuredResponses` annotation on controllers that require authentication to automatically document security-related error responses (e.g., 401, 403).
* **Meaningful Examples:** Use `@Schema(example = "...")` on DTO fields to provide realistic data samples. This significantly improves the developer experience.
* **`@ParameterObject`:** When using custom filter objects or `Pageable` in GET requests, annotate the parameter with `@ParameterObject` so its fields are correctly expanded into distinct query parameters in the documentation.

## 4. Error Handling Consistency
* Combine OpenAPI documentation with a `@ControllerAdvice` global exception handler to ensure that the error responses documented in your OpenAPI spec perfectly match the actual error JSON payloads returned by the application.
