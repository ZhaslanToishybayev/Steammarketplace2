#!/bin/bash

# ===========================================
# 🚀 Steam Marketplace Production Manager
# ===========================================

case "$1" in
  start)
    echo "🚀 Starting Steam Marketplace Production..."
    docker-compose up -d mongodb redis app
    echo "✅ All services started successfully!"
    echo "📊 Status: docker-compose ps"
    ;;
  stop)
    echo "🛑 Stopping Steam Marketplace Production..."
    docker-compose down
    echo "✅ All services stopped!"
    ;;
  restart)
    echo "🔄 Restarting Steam Marketplace Production..."
    docker-compose restart app
    echo "✅ Application restarted!"
    ;;
  status)
    echo "📊 Steam Marketplace Status:"
    docker-compose ps
    echo ""
    echo "🌐 Health Check:"
    curl -s http://localhost:3001/api/health | python3 -m json.tool || echo "⚠️  API not responding"
    ;;
  logs)
    echo "📋 Following application logs (Ctrl+C to exit)..."
    docker-compose logs -f app
    ;;
  logs-all)
    echo "📋 Following all logs (Ctrl+C to exit)..."
    docker-compose logs -f
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|logs|logs-all}"
    echo ""
    echo "Commands:"
    echo "  start     - Start all services (MongoDB, Redis, App)"
    echo "  stop      - Stop all services"
    echo "  restart   - Restart application"
    echo "  status    - Show service status and health"
    echo "  logs      - Follow app logs"
    echo "  logs-all  - Follow all service logs"
    exit 1
    ;;
esac
