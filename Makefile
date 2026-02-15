.PHONY: help build up down logs clean swagger frontend

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build all Docker images
	docker-compose build

up: ## Start all services
	docker-compose up -d

down: ## Stop all services
	docker-compose down

logs: ## Follow logs
	docker-compose logs -f

clean: ## Remove containers, volumes, and networks
	docker-compose down -v

swagger: ## Generate Swagger documentation
	cd backend && swag init -g cmd/server/main.go -o docs

frontend: ## Install frontend dependencies
	cd frontend && npm install

dev: ## Run in development mode
	docker-compose up

restart: down up ## Restart all services

ps: ## List running containers
	docker-compose ps
