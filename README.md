# 🎮 Steam Marketplace (P2P Trading)

A modern, secure, and scalable CS2 P2P (Peer-to-Peer) trading marketplace. Built with Next.js, Express, PostgreSQL, and Steam APIs.

![Steam Marketplace](https://via.placeholder.com/800x400.png?text=Steam+Marketplace+Banner)

## ✨ Features

- **P2P Trading**: Direct trade offers between users without bot storage limits.
- **Secure Escrow**: Automated trade verification and money holding.
- **Real-time**: Socket.io notifications for trade status updates.
- **Steam Login**: OpenID integration with secure session management.
- **Inventory Management**: View and list CS2 items from your Steam inventory.
- **Admin Dashboard**: Analytics, user management, and trade monitoring.

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TailwindCSS, React Query, Zustand
- **Backend**: Express.js, Node.js, Socket.io
- **Database**: PostgreSQL (Prisma/pg), Redis (Caching)
- **External**: Steam Web API, Steam Trade Offer Manager

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Steam API Key (Get it [here](https://steamcommunity.com/dev/apikey))

### 🐳 Fast Start (Docker)

1. **Clone the repo**
   ```bash
   git clone https://github.com/yourusername/steam-marketplace.git
   cd steam-marketplace
   ```

2. **Configure Environment**
   Copy `.env.example` to `.env` in both `apps/backend` and `apps/frontend` (or root `.env` for docker-compose).
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   # Fill in STEAM_API_KEY
   ```

3. **Run with Docker Compose**
   ```bash
   docker-compose up --build
   ```
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:3001`

### 🔧 Manual Development

1. **Install Dependencies**
   ```bash
   # Root (if workspace) or individual folders
   cd apps/backend && npm install
   cd apps/frontend && npm install
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

## 🔒 Security Measures

- **httpOnly Cookies**: JWT stored securely, inaccessible to JS.
- **CSRF Protection**: State-changing requests protected.
- **Rate Limiting**: Critical endpoints (login, API) throttled.
- **Input Validation**: Zod schemas for all inputs.
- **SSRF Protection**: Strict Steam ID validation.

## 🧪 Testing

We have a comprehensive test suite covering smoke, critical path, and edge cases.

```bash
cd apps/backend
# Critical e2e tests
npm test
# Full test suite
node tests/full-test-suite.js
```

## 📂 Project Structure

```
├── apps
│   ├── backend     # Express API & Bots
│   │   ├── src
│   │   │   ├── routes      # API Endpoints
│   │   │   ├── services    # Business Logic (Bot, Escrow)
│   │   │   └── utils       # Security, Retry, Helpers
│   └── frontend    # Next.js App
│       ├── src
│       │   ├── app         # App Router Pages
│       │   ├── components  # React Components
│       │   └── hooks       # Custom Hooks
```

## 🤝 Contribution

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
