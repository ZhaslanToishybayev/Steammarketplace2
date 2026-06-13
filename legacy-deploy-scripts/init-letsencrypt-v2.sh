#!/bin/bash
set -e # Exit on error

# Ensure directories exist
mkdir -p ./certbot/conf/live/sgomarket.com
mkdir -p ./certbot/www

# 1. Create dummy certificate
echo "### Creating dummy certificate ..."
sudo docker run --rm --entrypoint openssl -v "$(pwd)/certbot/conf:/etc/letsencrypt" certbot/certbot req -x509 -nodes -newkey rsa:4096 -days 1 -keyout /etc/letsencrypt/live/sgomarket.com/privkey.pem -out /etc/letsencrypt/live/sgomarket.com/fullchain.pem -subj '/CN=localhost'

# 2. Start Nginx
echo "### Starting Nginx ..."
# Remove orphans to avoid conflicts
sudo docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
# Start nginx in background
sudo docker-compose -f docker-compose.prod.yml up -d nginx
echo "### Waiting for Nginx to start ..."
sleep 10

# 3. Delete dummy certificate
echo "### Deleting dummy certificate ..."
sudo rm -rf ./certbot/conf/live/sgomarket.com
sudo rm -rf ./certbot/conf/archive/sgomarket.com
sudo rm -rf ./certbot/conf/renewal/sgomarket.com.conf

# 4. Request real certificate
echo "### Requesting Let's Encrypt certificate ..."
sudo docker run --rm --name certbot_run -v "$(pwd)/certbot/conf:/etc/letsencrypt" -v "$(pwd)/certbot/www:/var/www/certbot" certbot/certbot certonly --webroot -w /var/www/certbot -d sgomarket.com -d www.sgomarket.com --email admin@sgomarket.com --agree-tos --no-eff-email --force-renewal

# 5. Reload Nginx
echo "### Reloading Nginx ..."
sudo docker-compose -f docker-compose.prod.yml exec -T nginx nginx -s reload