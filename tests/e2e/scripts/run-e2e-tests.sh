#!/bin/bash

# E2E Test Execution Script
# Orchestrates complete E2E test suite execution

set -e

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="$PROJECT_ROOT/tests/e2e/artifacts/test-execution.log"
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
SKIP_CLEANUP=false
HEADLESS=true
PARALLEL=true
VERBOSE=false

# Functions
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

# Usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

E2E Test Execution Script

OPTIONS:
    --skip-cleanup          Skip cleanup of Docker containers and test data
    --headed                Run tests with visible browser windows
    --parallel              Run tests in parallel (default)
    --sequential            Run tests sequentially
    --verbose               Enable verbose logging
    --help                  Show this help message

EXAMPLES:
    $0                      Run full E2E test suite
    $0 --headed             Run tests with visible browsers
    $0 --sequential         Run tests one by one
    $0 --skip-cleanup       Skip cleanup after tests

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-cleanup)
            SKIP_CLEANUP=true
            shift
            ;;
        --headed)
            HEADLESS=false
            shift
            ;;
        --parallel)
            PARALLEL=true
            shift
            ;;
        --sequential)
            PARALLEL=false
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        error "Docker is not running"
        exit 1
    fi

    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed or not in PATH"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed or not in PATH"
        exit 1
    fi

    # Check if we're in the project directory
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        error "package.json not found. Please run from the project root directory."
        exit 1
    fi

    success "Prerequisites check passed"
}

# Start Docker services
start_docker_services() {
    log "Starting Docker services..."

    cd "$PROJECT_ROOT"

    # Start infrastructure services
    log "Starting PostgreSQL, MongoDB, and Redis..."
    docker compose up -d postgres mongodb redis

    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    timeout 120 bash -c 'until docker compose exec postgres pg_isready -U steam_user -d steam_marketplace; do sleep 2; done'
    timeout 120 bash -c 'until docker compose exec mongodb mongosh --eval "db.runCommand(\"ping\").ok" --quiet; do sleep 2; done'
    timeout 60 bash -c 'until docker compose exec redis redis-cli ping; do sleep 2; done'

    success "Docker services started successfully"
}

# Seed test data
seed_test_data() {
    log "Seeding test data..."

    cd "$PROJECT_ROOT"
    npm run test:e2e:seed

    success "Test data seeded successfully"
}

# Start backend service
start_backend() {
    log "Starting backend service..."

    cd "$PROJECT_ROOT"
    docker compose up -d backend

    # Wait for backend to be ready
    log "Waiting for backend to be ready..."
    timeout 180 bash -c 'until curl -f http://localhost:3001/api/health >/dev/null 2>&1; do sleep 5; done'

    success "Backend service started successfully"
}

# Start frontend service
start_frontend() {
    log "Starting frontend service..."

    cd "$PROJECT_ROOT"
    docker compose up -d frontend

    # Wait for frontend to be ready
    log "Waiting for frontend to be ready..."
    timeout 180 bash -c 'until curl -f http://localhost:3000 >/dev/null 2>&1; do sleep 5; done'

    success "Frontend service started successfully"
}

# Run Playwright tests
run_playwright_tests() {
    log "Running Playwright E2E tests..."

    cd "$PROJECT_ROOT"

    # Set environment variables for tests
    export NODE_ENV=test
    export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

    # Build test command
    local test_command="npx playwright test"

    if [[ $HEADLESS == true ]]; then
        test_command="$test_command --headless"
    else
        test_command="$test_command --headed"
    fi

    if [[ $PARALLEL == false ]]; then
        test_command="$test_command --workers=1"
    fi

    if [[ $VERBOSE == true ]]; then
        test_command="$test_command --verbose"
    fi

    # Run tests
    log "Executing: $test_command"
    if $test_command; then
        success "Playwright tests completed successfully"
        return 0
    else
        error "Playwright tests failed"
        return 1
    fi
}

# Run API integration tests
run_api_tests() {
    log "Running API integration tests..."

    cd "$PROJECT_ROOT"

    # Run Jest API tests
    if npm run test:e2e:api; then
        success "API tests completed successfully"
        return 0
    else
        error "API tests failed"
        return 1
    fi
}

# Analyze logs
analyze_logs() {
    log "Analyzing logs..."

    cd "$PROJECT_ROOT"

    # Run log analysis
    if [[ -f "tests/e2e/utils/log-analyzer.ts" ]]; then
        npx ts-node tests/e2e/utils/log-analyzer.ts || warning "Log analysis failed"
    else
        warning "Log analyzer not found, skipping"
    fi

    success "Log analysis completed"
}

# Check metrics
check_metrics() {
    log "Checking metrics..."

    cd "$PROJECT_ROOT"

    # Run metrics checker
    if [[ -f "tests/e2e/utils/metrics-checker.ts" ]]; then
        npx ts-node tests/e2e/utils/metrics-checker.ts || warning "Metrics check failed"
    else
        warning "Metrics checker not found, skipping"
    fi

    success "Metrics check completed"
}

# Inspect database
inspect_database() {
    log "Inspecting database..."

    cd "$PROJECT_ROOT"

    # Run database inspector
    if [[ -f "tests/e2e/utils/database-inspector.ts" ]]; then
        npx ts-node tests/e2e/utils/database-inspector.ts || warning "Database inspection failed"
    else
        warning "Database inspector not found, skipping"
    fi

    success "Database inspection completed"
}

# Generate test report
generate_report() {
    log "Generating test report..."

    cd "$PROJECT_ROOT"

    # Run report generator
    if [[ -f "tests/e2e/reports/test-report-generator.ts" ]]; then
        npx ts-node tests/e2e/reports/test-report-generator.ts || warning "Report generation failed"
    else
        warning "Report generator not found, skipping"
    fi

    # Generate Playwright report
    if command -v npx &> /dev/null && [[ -f "playwright.config.ts" ]]; then
        npx playwright show-report || warning "Playwright report generation failed"
    fi

    success "Test report generated"
}

# Cleanup
cleanup() {
    if [[ $SKIP_CLEANUP == true ]]; then
        log "Skipping cleanup as requested"
        return 0
    fi

    log "Cleaning up..."

    cd "$PROJECT_ROOT"

    # Stop Docker services
    log "Stopping Docker services..."
    docker compose down

    # Cleanup test data
    log "Cleaning up test data..."
    npm run test:e2e:cleanup || warning "Test data cleanup failed"

    success "Cleanup completed"
}

# Main execution
main() {
    local start_time=$SECONDS
    local test_result=0

    log "Starting E2E test execution at $(date)"
    log "Configuration: HEADLESS=$HEADLESS, PARALLEL=$PARALLEL, VERBOSE=$VERBOSE, SKIP_CLEANUP=$SKIP_CLEANUP"

    # Create artifacts directory
    mkdir -p "$PROJECT_ROOT/tests/e2e/artifacts"

    # Initialize log file
    echo "E2E Test Execution Log - $TIMESTAMP" > "$LOG_FILE"
    echo "========================================" >> "$LOG_FILE"
    echo "Configuration: HEADLESS=$HEADLESS, PARALLEL=$PARALLEL, VERBOSE=$VERBOSE, SKIP_CLEANUP=$SKIP_CLEANUP" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"

    # Execute test suite
    check_prerequisites

    start_docker_services
    seed_test_data
    start_backend
    start_frontend

    # Run tests
    if ! run_playwright_tests; then
        test_result=1
    fi

    if ! run_api_tests; then
        test_result=1
    fi

    # Post-test analysis
    analyze_logs
    check_metrics
    inspect_database
    generate_report

    # Cleanup
    cleanup

    # Summary
    local duration=$((SECONDS - start_time))
    local exit_code=$test_result

    if [[ $exit_code -eq 0 ]]; then
        success "E2E test suite completed successfully in ${duration}s"
    else
        error "E2E test suite completed with failures in ${duration}s"
    fi

    log "Test execution log saved to: $LOG_FILE"
    log "Artifacts location: $PROJECT_ROOT/tests/e2e/artifacts/"

    exit $exit_code
}

# Trap to ensure cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"