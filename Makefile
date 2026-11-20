# Local development shortcuts. `make help` lists them.
SHELL := /bin/bash
.PHONY: help dev setup db db-stop db-reset back front web android check test e2e

help: ## List commands
	@grep -E '^[a-z0-9-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-10s %s\n", $$1, $$2}'

dev: ## Everything at once: Postgres + backend + web app (Ctrl+C stops)
	./scripts/dev.sh

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

front: ## Expo dev server: QR for Expo Go, `w` = web, `a` = Android
	cd front && npx expo start

web: ## App in the browser at http://localhost:8081
	cd front && npx expo start --web

android: ## App on a running Android emulator
	cd front && npx expo start --android

check: ## Frontend typecheck + lint + tests, backend tests
	cd front && npm run check
	cd back && ./mvnw -q test

test: check

e2e: ## End-to-end tests in Chromium (reuses a running backend/app). Resets demo-user's onboarding
	cd front && npx playwright install chromium && npx playwright test
