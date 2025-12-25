# 🎮 Steam Marketplace (P2P Trading)

A modern, secure, and scalable CS2 P2P (Peer-to-Peer) trading marketplace. Built with Next.js, Express, PostgreSQL, and Steam APIs.

## ✨ Features

- **P2P Trading**: Direct trade offers between users without bot storage limits
- **Secure Escrow**: Automated trade verification and money holding
- **Real-time Updates**: Socket.io notifications for trade status updates
- **Steam Login**: OpenID integration with secure session management
- **Inventory Management**: View and list CS2 items from your Steam inventory
- **Wallet System**: Internal balance management for seamless transactions
- **Admin Dashboard**: Analytics, user management, and trade monitoring
- **Proxy Support**: Built-in proxy rotation for reliable Steam API access

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 14, TypeScript, TailwindCSS, React Query, Zustand |
| **Backend** | Express.js, Node.js, Socket.io |
| **Database** | PostgreSQL, Redis (Caching) |
| **Infrastructure** | Docker, Nginx, Prometheus, Grafana |
| **External APIs** | Steam Web API, Steam Trade Offer Manager |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Steam API Key ([Get it here](https://steamcommunity.com/dev/apikey))

### 🐳 Quick Start (Docker)

1. **Clone the repository**
   ```bash
   git clone https://github.com/ZhaslanToishybayev/Steammarketplace2.git
   cd Steammarketplace2
   ```

2. **Configure Environment**
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   cp apps/frontend/.env.example apps/frontend/.env
   ```
   Edit `.env` files and add your `STEAM_API_KEY` and other required variables.

3. **Run with Docker Compose**
   ```bash
   docker-compose up --build
   ```
   
   Services will be available at:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:3001`

### 🔧 Manual Development

1. **Install Dependencies**
   ```bash
   cd apps/backend && npm install
   cd ../frontend && npm install
   ```

2. **Start Backend**
   ```bash
   cd apps/backend
   npm run dev
   ```

3. **Start Frontend**
   ```bash
   cd apps/frontend
   npm run dev
   ```

## 📂 Project Structure

```
├── apps/
│   ├── backend/          # Express API Server
│   │   ├── src/
│   │   │   ├── routes/   # API Endpoints
│   │   │   ├── services/ # Business Logic
│   │   │   ├── models/   # Database Models
│   │   │   └── middleware/
│   │   └── tests/
│   └── frontend/         # Next.js Application
│       ├── src/
│       │   ├── app/      # App Router Pages
│       │   ├── components/
│       │   ├── hooks/
│       │   └── stores/
├── docker/               # Docker configurations
├── scripts/              # Utility scripts
└── tests/                # E2E tests
```

## 🔒 Security

- **httpOnly Cookies**: JWT stored securely, inaccessible to JavaScript
- **CSRF Protection**: State-changing requests protected
- **Rate Limiting**: Critical endpoints throttled
- **Input Validation**: Zod schemas for all inputs
- **SSRF Protection**: Strict Steam ID validation

## 🧪 Testing

```bash
cd apps/backend

# Run tests
npm test

# Full test suite
node tests/full-test-suite.js
```

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Author**: [Zhaslan Toishybayev](https://github.com/ZhaslanToishybayev)
