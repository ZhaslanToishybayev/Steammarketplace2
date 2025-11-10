#!/bin/bash
# ===========================================
# 🔍 VPS Diagnostic Commands
# Run these on your target VPS (194.x.x.x)
# ===========================================

echo "=========================================="
echo "🔍 VPS Diagnostic Report"
echo "=========================================="

# System Information
echo -e "\n📋 SYSTEM INFO:"
uname -a
echo "Uptime: $(uptime)"

# Check if Docker is installed
echo -e "\n🐳 DOCKER:"
if command -v docker &> /dev/null; then
    docker --version
    docker info | head -5
else
    echo "❌ Docker NOT installed"
fi

# Check if Docker Compose is installed
echo -e "\n📦 DOCKER COMPOSE:"
if command -v docker-compose &> /dev/null; then
    docker-compose --version
else
    echo "❌ Docker Compose NOT installed"
fi

# Check Node.js
echo -e "\n📦 NODE.JS:"
if command -v node &> /dev/null; then
    node --version
    npm --version 2>/dev/null || echo "npm NOT found"
else
    echo "❌ Node.js NOT installed"
fi

# Check Git
echo -e "\n🔧 GIT:"
if command -v git &> /dev/null; then
    git --version
else
    echo "❌ Git NOT installed"
fi

# Port availability
echo -e "\n🌐 PORT AVAILABILITY:"
for port in 3001 27017 6379 80 443; do
    if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
        echo "⚠️  Port $port: IN USE"
    else
        echo "✅ Port $port: FREE"
    fi
done

# Disk space
echo -e "\n💾 DISK SPACE:"
df -h / | grep -v Filesystem

# Memory
echo -e "\n🧠 MEMORY:"
free -h

# Firewall
echo -e "\n🔥 FIREWALL STATUS:"
if command -v ufw &> /dev/null; then
    ufw status
else
    echo "ufw not installed"
fi

echo -e "\n=========================================="
echo "✅ Diagnostic Complete"
echo "=========================================="
