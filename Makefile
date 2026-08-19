SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help

# Local DB connection — mirrors docker-compose.yml; override via the environment.
# migration:run reads these from env (NOT the YAML config), so they must be exported.
export DB_POSTGRES_HOST ?= localhost
export DB_POSTGRES_PORT ?= 5432
export DB_POSTGRES_USERNAME ?= root
export DB_POSTGRES_PASSWORD ?= password
export DB_POSTGRES_DATABASE_NAME ?= bitshala

.PHONY: help install setup config up up-fg wait-db down destroy \
        migrate clear-tasks snapshot restore dev-backend dev-frontend \
        test test-watch typecheck lint build format

help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
	  | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-13s\033[0m %s\n",$$1,$$2}'

install: ## Install npm dependencies
	npm install

setup: install ## Install deps and build @nonce/shared (required before typecheck/build)
	npm run build:shared

config: ## Create apps/backend/config/dev.config.yaml from the example if missing (run manually)
	@test -f apps/backend/config/dev.config.yaml \
	  || cp apps/backend/config/dev.config.example.yaml apps/backend/config/dev.config.yaml

up: ## Start Postgres/Redis/Mailcrab (detached) and wait for Postgres
	docker compose up -d
	$(MAKE) wait-db

up-fg: ## Start the Docker stack in the foreground (Ctrl-C to stop)
	docker compose up

wait-db: ## Block until Postgres accepts connections
	until docker compose exec -T bitshala-db pg_isready -U $(DB_POSTGRES_USERNAME) -d $(DB_POSTGRES_DATABASE_NAME) >/dev/null 2>&1; do \
	  echo "waiting for postgres..."; sleep 1; \
	done

down: ## Stop the Docker stack (keep data)
	docker compose down

destroy: ## Stop the Docker stack AND wipe the database volume
	docker compose down -v

migrate: up ## Bring up the stack, then apply pending TypeORM migrations
	npm run migration:run

clear-tasks: migrate ## After migrating, delete due UNPROCESSED rows from api_task (executeOnTime <= now)
	docker compose exec -T bitshala-db psql -U $(DB_POSTGRES_USERNAME) -d $(DB_POSTGRES_DATABASE_NAME) -c "DELETE FROM api_task WHERE status = 'UNPROCESSED' AND \"executeOnTime\" <= now();"

snapshot: ## pg_dump the local DB into apps/backend/snapshots
	npm run db:snapshot

restore: ## Restore a snapshot (e.g. make restore ARGS="--list")
	npm run db:restore -- $(ARGS)

dev-backend: clear-tasks ## up + migrate + clear UNPROCESSED tasks, then run NestJS in watch mode
	npm run dev:backend

dev-frontend: ## Run the Vite dev server
	npm run dev:frontend

test: ## Run the backend Jest suite
	npm test

test-watch: ## Run the backend Jest suite in watch mode
	npm run test:watch -w @nonce/backend

typecheck: ## Build shared, then typecheck all workspaces
	npm run typecheck

lint: ## Lint all workspaces
	npm run lint

build: ## Build shared -> backend -> frontend
	npm run build

format: ## Prettier write (backend + shared)
	npm run format
