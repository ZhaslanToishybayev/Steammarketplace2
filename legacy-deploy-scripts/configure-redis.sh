#!/bin/bash

# Redis Configuration Script

echo "🔧 Configuring Redis for Steam Marketplace..."

# Check if Redis is running
if ! pgrep redis-server > /dev/null; then
    echo "❌ Redis is not running. Please start Redis first:"
    echo "   sudo systemctl start redis"
    echo "   or"
    echo "   redis-server"
    exit 1
fi

# Test Redis connection
echo "🔍 Testing Redis connection..."
redis-cli ping

if [ $? -eq 0 ]; then
    echo "✅ Redis is accessible"
else
    echo "❌ Redis connection failed"
    exit 1
fi

# Configure Redis databases
echo "🗄️ Configuring Redis databases..."
redis-cli CONFIG SET databases 16

# Test with password
echo "🔑 Testing Redis password authentication..."
redis-cli -a b180bbe5fdc629903c2d9f95ff9aa203 ping

if [ $? -eq 0 ]; then
    echo "✅ Redis password authentication working"
else
    echo "⚠️ Redis password authentication may need configuration"
    echo "   Set password in redis.conf: requirepass b180bbe5fdc629903c2d9f95ff9aa203"
fi

echo "🎉 Redis configuration complete!"
