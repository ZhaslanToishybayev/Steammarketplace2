#!/bin/bash

# Steam Marketplace - Production Secrets Generator
# This script generates secure secrets for production deployment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
OUTPUT_FILE=".env.production"
BACKEND_ENV_FILE="apps/backend/.env.production"
FRONTEND_ENV_FILE="apps/frontend/.env.production"

echo -e "${BLUE}🔒 Steam Marketplace Production Secrets Generator${NC}"
echo "=================================================="
echo ""

# Function to generate secrets
generate_secret() {
    local length=$1
    openssl rand -hex $length
}

generate_base64_secret() {
    local length=$1
    openssl rand -base64 $length | tr -d '\n=' | head -c $length
}

generate_jwt_secret() {
    openssl rand -base64 64 | tr -d '\n='
}

# Function to check if OpenSSL is available
check_openssl() {
    if ! command -v openssl &> /dev/null; then
        echo -e "${RED}❌ OpenSSL is required but not installed${NC}"
        echo "Please install OpenSSL: sudo apt install openssl"
        exit 1
    fi
}

# Function to create environment file template
create_env_template() {
    local env_file=$1
    local template_file=$2

    if [ ! -f "$env_file" ]; then
        if [ -f "$template_file" ]; then
            cp "$template_file" "$env_file"
            echo -e "${GREEN}✅ Created $env_file from template${NC}"
        else
            touch "$env_file"
            echo -e "${YELLOW}⚠️  Created empty $env_file${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  $env_file already exists, skipping creation${NC}"
    fi
}

# Function to update environment file
update_env_file() {
    local env_file=$1
    local key=$2
    local value=$3
    local comment=$4

    # Remove existing line with same key
    sed -i "/^${key}=/d" "$env_file" 2>/dev/null || true

    # Add comment if provided
    if [ -n "$comment" ]; then
        echo "# $comment" >> "$env_file"
    fi

    # Add the key-value pair
    echo "${key}=${value}" >> "$env_file"
    echo -e "${GREEN}✅ Added $key to $env_file${NC}"
}

# Function to validate secrets
validate_secret() {
    local secret=$1
    local name=$2
    local min_length=$3

    if [ ${#secret} -lt $min_length ]; then
        echo -e "${RED}❌ $name is too short (${#secret} chars, minimum $min_length)${NC}"
        return 1
    fi

    echo -e "${GREEN}✅ $name is valid (${#secret} chars)${NC}"
    return 0
}

# Function to display summary
display_summary() {
    echo ""
    echo -e "${BLUE}📋 Production Environment Setup Complete${NC}"
    echo "=========================================="
    echo ""
    echo -e "${YELLOW}📁 Environment Files:${NC}"
    echo "  • Main: $OUTPUT_FILE"
    echo "  • Backend: $BACKEND_ENV_FILE"
    echo "  • Frontend: $FRONTEND_ENV_FILE"
    echo ""
    echo -e "${YELLOW}🔑 Generated Secrets:${NC}"
    echo "  • JWT Secret: ${#JWT_SECRET} characters"
    echo "  • JWT Refresh Secret: ${#JWT_REFRESH_SECRET} characters"
    echo "  • Bot Encryption Key: ${#BOT_ENCRYPTION_KEY} characters"
    echo "  • Database Passwords: ${#POSTGRES_PASSWORD} characters each"
    echo ""
    echo -e "${YELLOW}⚠️  Next Steps:${NC}"
    echo "  1. Review the generated files"
    echo "  2. Add missing variables (Steam API key, payment keys, etc.)"
    echo "  3. Set proper file permissions: chmod 600 *.env.production"
    echo "  4. Store secrets securely (password manager, vault, etc.)"
    echo ""
    echo -e "${RED}🔒 Security Reminders:${NC}"
    echo "  • Never commit .env.production files to version control"
    echo "  • Use different secrets for each environment"
    echo "  • Rotate secrets regularly"
    echo "  • Store backups securely"
}

# Main execution
main() {
    echo -e "${BLUE}Starting production secrets generation...${NC}"
    echo ""

    # Check prerequisites
    check_openssl

    # Create environment files
    echo -e "${BLUE}Creating environment files...${NC}"
    create_env_template "$OUTPUT_FILE" ".env.production.example"
    create_env_template "$BACKEND_ENV_FILE" "apps/backend/.env.example"
    create_env_template "$FRONTEND_ENV_FILE" "apps/frontend/.env.example"

    echo ""

    # Generate secrets
    echo -e "${BLUE}Generating secure secrets...${NC}"

    # JWT Secrets (64 bytes each for maximum security)
    JWT_SECRET=$(generate_jwt_secret)
    JWT_REFRESH_SECRET=$(generate_jwt_secret)

    # Bot Encryption Key (exactly 32 characters for AES-256)
    BOT_ENCRYPTION_KEY=$(generate_base64_secret 32)

    # Database Passwords (32 bytes each)
    POSTGRES_PASSWORD=$(generate_base64_secret 32)
    MONGO_ROOT_PASSWORD=$(generate_base64_secret 32)
    REDIS_PASSWORD=$(generate_base64_secret 32)

    # Validate secrets
    echo ""
    echo -e "${BLUE}Validating generated secrets...${NC}"
    validate_secret "$JWT_SECRET" "JWT Secret" 64
    validate_secret "$JWT_REFRESH_SECRET" "JWT Refresh Secret" 64
    validate_secret "$BOT_ENCRYPTION_KEY" "Bot Encryption Key" 32
    validate_secret "$POSTGRES_PASSWORD" "PostgreSQL Password" 16
    validate_secret "$MONGO_ROOT_PASSWORD" "MongoDB Password" 16
    validate_secret "$REDIS_PASSWORD" "Redis Password" 16

    echo ""

    # Update main environment file
    echo -e "${BLUE}Updating main environment file...${NC}"

    # Add header
    {
        echo "# Steam Marketplace Production Environment"
        echo "# Generated on $(date)"
        echo "# IMPORTANT: Update the values marked with [UPDATE REQUIRED]"
        echo ""
        echo "# Application Configuration"
        echo "NODE_ENV=production"
        echo "PORT=3001"
        echo ""
    } > "$OUTPUT_FILE"

    # Add database configuration
    update_env_file "$OUTPUT_FILE" "POSTGRES_PASSWORD" "$POSTGRES_PASSWORD" "PostgreSQL database password"
    update_env_file "$OUTPUT_FILE" "MONGO_ROOT_PASSWORD" "$MONGO_ROOT_PASSWORD" "MongoDB root password"
    update_env_file "$OUTPUT_FILE" "REDIS_PASSWORD" "$REDIS_PASSWORD" "Redis authentication password"

    echo "" >> "$OUTPUT_FILE"

    # Add authentication configuration
    update_env_file "$OUTPUT_FILE" "JWT_SECRET" "$JWT_SECRET" "JWT authentication secret (64+ chars)"
    update_env_file "$OUTPUT_FILE" "JWT_REFRESH_SECRET" "$JWT_REFRESH_SECRET" "JWT refresh secret (64+ chars)"
    update_env_file "$OUTPUT_FILE" "BOT_ENCRYPTION_KEY" "$BOT_ENCRYPTION_KEY" "Bot credentials encryption key"

    echo "" >> "$OUTPUT_FILE"

    # Add placeholder for external services
    echo "# External Services (UPDATE REQUIRED)" >> "$OUTPUT_FILE"
    echo "# STEAM_API_KEY=your-real-steam-api-key-here" >> "$OUTPUT_FILE"
    echo "# STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key-here" >> "$OUTPUT_FILE"
    echo "# CRYPTO_API_KEY=your-crypto-api-key-here" >> "$OUTPUT_FILE"
    echo ""

    # Add placeholder for domain configuration
    echo "# Domain Configuration (UPDATE REQUIRED)" >> "$OUTPUT_FILE"
    echo "# CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com" >> "$OUTPUT_FILE"
    echo "# WS_URL=wss://yourdomain.com" >> "$OUTPUT_FILE"
    echo "# STEAM_REALM=https://yourdomain.com" >> "$OUTPUT_FILE"
    echo "# STEAM_RETURN_URL=https://yourdomain.com/api/auth/steam/return" >> "$OUTPUT_FILE"

    # Update backend environment file
    echo ""
    echo -e "${BLUE}Updating backend environment file...${NC}"

    # Add header
    {
        echo "# Backend Production Environment"
        echo "# Generated on $(date)"
        echo ""
        echo "# Application"
        echo "NODE_ENV=production"
        echo "PORT=3001"
        echo ""
    } > "$BACKEND_ENV_FILE"

    # Copy relevant variables from main file
    while IFS= read -r line; do
        if [[ $line =~ ^[A-Z_]+=.+$ ]] && [[ ! $line =~ ^# ]]; then
            echo "$line" >> "$BACKEND_ENV_FILE"
        fi
    done < "$OUTPUT_FILE"

    # Set file permissions
    echo ""
    echo -e "${BLUE}Setting file permissions...${NC}"
    chmod 600 "$OUTPUT_FILE"
    chmod 600 "$BACKEND_ENV_FILE"
    chmod 600 "$FRONTEND_ENV_FILE" 2>/dev/null || true

    echo -e "${GREEN}✅ File permissions set to 600${NC}"

    # Display summary
    display_summary

    # Security warning
    echo ""
    echo -e "${RED}🚨 SECURITY WARNING 🚨${NC}"
    echo "======================"
    echo "• Store these secrets in a secure location"
    echo "• Never share them publicly or commit to version control"
    echo "• Consider using a secrets management system for production"
    echo "• Rotate these secrets regularly"
    echo ""
}

# Run main function
main "$@"