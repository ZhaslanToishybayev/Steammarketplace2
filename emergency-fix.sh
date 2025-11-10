#\!/bin/bash
# ===========================================
# 🚨 EMERGENCY FIX - Clean Everything
# ===========================================

echo "🚨 EMERGENCY FIX - Cleaning all containers and volumes"

# 1. Stop ALL
docker-compose -f docker-compose.prod.yml down -v --remove-orphans

# 2. Clean Docker completely
docker system prune -af

# 3. Recreate from scratch
echo "🔄 Starting fresh..."
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Wait
sleep 90

# 5. Check
echo "📊 STATUS:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "🌐 API Test:"
curl -s http://localhost:3001/api/health || echo "API not ready"

echo ""
echo "🏠 Website Test:"
curl -I http://localhost:3001/ 2>/dev/null | head -1 || echo "Website not ready"

echo ""
echo "✅ Emergency fix complete\!"
