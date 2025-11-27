# 🚀 Steam Marketplace

Professional Steam item marketplace with real-time integration, trading automation, and advanced analytics.

## 🎯 Features

### 🌐 **Frontend (Next.js 14)**
- Modern App Router architecture
- Server Components for optimal performance
- Responsive design with TailwindCSS
- Real-time price updates via WebSocket
- Advanced filtering and search

### 🔧 **Backend (NestJS)**
- Modular architecture with dependency injection
- JWT authentication with Steam OAuth
- Multi-database strategy (PostgreSQL + MongoDB + Redis)
- Comprehensive API with OpenAPI documentation
- Rate limiting and security measures

### 🎮 **Steam Integration**
- Real-time market price fetching
- Steam Community inventory access
- Automated trade offer creation
- Mobile authenticator support
- Trade confirmation handling

### 📊 **Analytics & Monitoring**
- Price trend analysis
- Market sentiment indicators
- ROI calculators
- User behavior tracking
- Performance monitoring

## 🏗️ Architecture

### Multi-Database Strategy
- **PostgreSQL**: Core data (users, products, orders, payments)
- **MongoDB**: Flexible data (Steam inventories, market data, analytics)
- **Redis**: Caching, sessions, rate limiting

### Micro-Frontend Structure
- **Marketplace**: Public item browsing and purchasing
- **Dashboard**: User profile, orders, inventory
- **Admin Panel**: Management and moderation tools

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- MongoDB 6+
- Redis 7+

### Installation

1. **Clone and setup**
   ```bash
   git clone https://github.com/ZhaslanToishybayev/Steammarketplace2.git
   cd Steammarketplace2
   npm install
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

3. **Database setup**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

4. **Start development**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
Steammarketplace2/
├── apps/
│   ├── frontend/           # Next.js 14 frontend
│   └── backend/            # NestJS backend
├── packages/
│   ├── shared/             # Shared types and utilities
│   ├── steam-integration/  # Steam API integration
│   └── ui/                 # Design system
├── tools/                  # Development tools
└── docker/                 # Docker configurations
```

## 🔐 Environment Variables

```.env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/steam_marketplace"
MONGODB_URL="mongodb://localhost:27017/steam_marketplace"
REDIS_URL="redis://localhost:6379"

# Steam API
STEAM_API_KEY="your_steam_api_key"
STEAM_BOT_USERNAME="your_bot_username"
STEAM_BOT_PASSWORD="your_bot_password"
STEAM_BOT_SHARED_SECRET="your_shared_secret"
STEAM_BOT_IDENTITY_SECRET="your_identity_secret"
STEAM_BOT_STEAMID="your_bot_steamid"

# Authentication
JWT_SECRET="your_jwt_secret"
OAUTH_REDIRECT_URL="http://localhost:3000/auth/steam/callback"

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="ws://localhost:3001"
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:e2e

# Code quality
npm run lint
npm run format
```

## 🚢 Deployment

```bash
# Build for production
npm run build

# Start production server
npm run start
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Add tests for your changes
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Join our Discord server
- Email us at support@steammarketplace.com

---

**Ready for production deployment in 31.5 days!** 🚀
