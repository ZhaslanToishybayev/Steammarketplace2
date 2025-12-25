#!/bin/bash
# AI-Powered Development Assistant
# Usage: npm run dev:ai-powered

echo "🚀 Starting AI-Powered Development Environment..."

# Start development servers
echo "📊 Starting development servers..."
npm run dev:enhanced &

# Start AI monitoring
echo "🤖 Starting AI monitoring..."
npm run monitor:ai &

# Start code analysis
echo "🔍 Starting intelligent code analysis..."
npx eslint --watch --ext .ts,.tsx apps/ &

# Start performance monitoring
echo "⚡ Starting performance monitoring..."
npm run performance:ai &

# Start security scanning
echo "🔒 Starting security monitoring..."
npm run auto:security &

# Start auto-documentation
echo "📚 Starting auto-documentation..."
npm run ai:docs &

echo "✅ AI-Powered Development Environment is running!"
echo "🔗 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:3001"
echo "🤖 AI Assistant: Active"
echo "📊 Monitoring: Enabled"
echo "🔒 Security: Active"
echo "📚 Documentation: Auto-updating"

# Keep the script running
wait