# Local development shortcuts. `make help` lists them.
SHELL := /bin/bash
.PHONY: help dev phone setup db db-stop db-reset back front web android check test

help: ## List commands
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-10s %s\n", $$1, $$2}'

dev: ## Everything at once: Postgres + backend + web app on localhost (Ctrl+C stops)
	./scripts/dev.sh

phone: ## Everything at once + Expo tunnel QR for a phone (Ctrl+C stops)
	./scripts/dev.sh --phone

setup: ## One-time: .env + frontend dependencies
	@test -f .env || cp .env.example .env
	cd front && npm install

db: ## Postgres in Docker (port from .env, default 5433)
	docker compose up -d --wait

db-stop: ## Stop Postgres (data is kept)
	docker compose stop

db-reset: ## Delete the database with all data (Flyway recreates the schema on backend start)
	docker compose down -v

back: db ## Spring Boot backend on :8080 (reads .env itself)
	cd back && ./mvnw spring-boot:run

front: ## Expo dev server on localhost (`w` = web, `a` = Android)
	cd front && npx expo start --localhost

web: ## App in the browser at http://localhost:8081 (loopback only)
	cd front && npx expo start --web --localhost

android: ## App on a running Android emulator (loopback only)
	cd front && npx expo start --android --localhost

check: ## Frontend typecheck + lint + tests, backend tests
	cd front && npm run check
	cd back && ./mvnw -q test

test: check
