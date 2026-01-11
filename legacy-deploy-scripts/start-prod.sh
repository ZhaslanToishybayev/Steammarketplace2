#!/bin/bash
set -e

echo "### Stopping existing containers..."
sudo docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true

echo "### Starting Production Stack with Correct Environment..."
# Always sync .env with .env.production because docker-compose.prod.yml uses 'env_file: .env'
cp .env.production .env

# Check if docker-compose supports --env-file (v1.25+)
if sudo docker-compose --help | grep -q -- --env-file; then
  sudo docker-compose --env-file .env.production -f docker-compose.prod.yml up -d --build
else
  # Fallback: copy to .env (if not already done/working) and source it
  echo "Legacy docker-compose detected or --env-file issue. Copying .env.production to .env"
  cp .env.production .env
  # Export variables just in case
  set -a
  source .env.production
  set +a
  sudo -E docker-compose -f docker-compose.prod.yml up -d --build
fi

echo "### Verifying Stack..."
sleep 5
sudo docker ps
sudo docker logs --tail 20 steam_backend
