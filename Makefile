# Steam Marketplace - Simple Makefile

.PHONY: help dev down clean install test-e2e test-e2e-ui test-e2e-headed test-e2e-api test-e2e-report seed-test-data cleanup-test-data test-all db-verify db-seed db-status db-init

# Default target
help:
	@echo "Steam Marketplace - Available Commands"
	@echo "===================================="
	@echo ""
	@echo "Development:"
	@echo "  dev         - Start development environment"
	@echo "  down        - Stop all containers"
	@echo "  clean       - Clean up everything"
	@echo "  install     - Install dependencies"
	@echo ""
	@echo "Database:"
	@echo "  db-verify   - Verify database tables and collections exist"
	@echo "  db-seed     - Seed market data (1000+ items, 10-15 min)"
	@echo "  db-status   - Display database population statistics"
	@echo "  db-init     - Full database initialization (tables + seeding)"
	@echo ""
	@echo "Testing:"
	@echo "  test-e2e    - Run full E2E test suite"
	@echo "  test-e2e-ui - Run E2E tests in UI mode"
	@echo "  test-e2e-headed - Run E2E tests with visible browser"
	@echo "  test-e2e-api - Run API integration tests only"
	@echo "  test-e2e-report - Open E2E test report"
	@echo "  seed-test-data - Seed databases with test data"
	@echo "  cleanup-test-data - Remove test data"
	@echo "  test-all    - Run all tests (backend, frontend, E2E)"
	@echo ""

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	@echo "📦 Installing backend dependencies..."
	cd apps/backend && npm install
	@echo "📦 Installing frontend dependencies..."
	cd apps/frontend && npm install
	@echo "✅ Dependencies installed"

# Development environment
dev: install
	@echo "🚀 Starting development environment..."
	docker compose up -d postgres mongodb redis
	@echo "⏳ Waiting for databases to be ready..."
	sleep 10
	docker compose up -d backend
	@echo "⏳ Waiting for backend to be ready..."
	sleep 5
	docker compose up -d frontend
	@echo "✅ Development environment is ready!"
	@echo "🔗 Frontend: http://localhost:3000"
	@echo "🔗 Backend API: http://localhost:3001/api"
	@echo "📚 API Docs: http://localhost:3001/api/docs"
	@echo ""
	@echo "To view logs, run: docker compose logs -f"

down:
	@echo "🛑 Stopping all containers..."
	docker compose down
	@echo "✅ All containers stopped"

clean:
	@echo "🧹 Cleaning up..."
	docker compose down -v --remove-orphans
	docker system prune -f
	rm -rf node_modules apps/backend/node_modules apps/frontend/node_modules
	rm -rf apps/backend/dist apps/frontend/.next apps/frontend/out
	rm -rf coverage apps/backend/coverage apps/frontend/coverage
	@echo "✅ Cleanup completed"

logs:
	@echo "📋 Combined logs (use Ctrl+C to exit)..."
	docker compose logs -f

# E2E Testing Commands
test-e2e:
	@echo "🧪 Running full E2E test suite..."
	npm run test-e2e:full

test-e2e-ui:
	@echo "🧪 Running E2E tests in UI mode..."
	npm run test-e2e:ui

test-e2e-headed:
	@echo "🧪 Running E2E tests with visible browser..."
	npm run test-e2e:headed

test-e2e-api:
	@echo "🧪 Running API integration tests..."
	npm run test-e2e:api

test-e2e-report:
	@echo "📄 Opening E2E test report..."
	npm run test-e2e:report

seed-test-data:
	@echo "📦 Seeding test data..."
	npm run test-e2e:seed

cleanup-test-data:
	@echo "🧹 Cleaning up test data..."
	npm run test-e2e:cleanup

test-all:
	@echo "🧪 Running all tests (backend, frontend, E2E)..."
	npm run test

# Database Commands
db-verify:
	@echo "🔍 Verifying database initialization..."
	@echo "📦 Ensuring database services are running..."
	docker compose up -d postgres mongodb redis
	@echo "⏳ Waiting for databases to be ready..."
	sleep 10
	cd apps/backend && npm run db:verify

db-seed:
	@echo "🚀 Seeding market data..."
	@echo "📦 Ensuring database services are running..."
	docker compose up -d postgres mongodb redis
	@echo "⏳ Seeding 1000+ CS:GO items from Steam Market (10-15 minutes)..."
	cd apps/backend && npm run db:seed

db-status:
	@echo "📊 Checking database population status..."
	@echo "📦 Ensuring database services are running..."
	docker compose up -d postgres mongodb redis
	@echo "⏳ Gathering statistics..."
	cd apps/backend && npm run db:status

db-init:
	@echo "🚀 Full Database Initialization"
	@echo "================================"
	@echo "📦 Starting database services..."
	docker compose up -d postgres mongodb redis
	@echo "⏳ Waiting for health checks..."
	sleep 15
	docker compose ps --filter health=healthy
	@echo ""
	@echo "🔧 Auto-creating database tables..."
	cd apps/backend && npm run start:dev &
	BACKEND_PID=$!
	@echo "⏳ Waiting for backend to start and create tables..."
	sleep 30
	@echo "🛑 Stopping backend (PID: $$BACKEND_PID)..."
	kill $$BACKEND_PID || true
	sleep 5
	@echo ""
	@echo "✅ Verifying schema..."
	cd apps/backend && npm run db:verify
	@echo ""
	@echo "📦 Seeding market data..."
	cd apps/backend && npm run db:seed
	@echo ""
	@echo "📊 Final status check..."
	cd apps/backend && npm run db:status
	@echo ""
	@echo "🎉 Database initialization complete! Ready for development."
	@echo "🔗 Start backend: cd apps/backend && npm run start:dev"
	@echo "📚 API Docs: http://localhost:3001/api/docs"