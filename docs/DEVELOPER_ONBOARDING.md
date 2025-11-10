# 🚀 Developer Onboarding Guide

Welcome to the Steam Marketplace team! This guide will help you get up to speed with our codebase, development workflow, and best practices.

## Table of Contents

1. [Welcome](#-welcome)
2. [Project Overview](#-project-overview)
3. [Technology Stack](#-technology-stack)
4. [Development Environment Setup](#️-development-environment-setup)
5. [Project Structure](#-project-structure)
6. [Core Concepts](#-core-concepts)
7. [Development Workflow](#-development-workflow)
8. [Testing](#-testing)
9. [Database](#-database)
10. [API Documentation](#-api-documentation)
11. [Debugging](#-debugging)
12. [Contributing Guidelines](#-contributing-guidelines)
13. [Common Tasks](#-common-tasks)
14. [Troubleshooting](#-troubleshooting)
15. [Resources](#-resources)

## 🎉 Welcome

We're excited to have you on the team! This guide covers everything you need to know to become a productive member of the Steam Marketplace development team.

The goal is to get you:
- **Running locally** in 30 minutes
- **Making your first contribution** by end of day 1
- **Feeling comfortable** with the codebase in your first week

## 📋 Project Overview

Steam Marketplace is a platform for buying and selling CSGO/CS2 skins with Steam integration.

### Key Features
- 🔐 **Steam Authentication** - Login via Steam OpenID
- 💰 **Digital Wallet** - Add funds, make purchases
- 🛒 **Marketplace** - Buy and sell skins
- 🔄 **Trade Management** - Steam trade offer integration
- 📊 **Real-time Monitoring** - Prometheus metrics, Grafana dashboards
- 🔔 **Slack Notifications** - Real-time alerts

### Business Value
- Provide a safe, secure platform for skin trading
- Competitive pricing through market-based approach
- Real-time inventory and pricing updates
- Comprehensive security and fraud prevention

## 🛠️ Technology Stack

### Core Technologies
| Category | Technology | Purpose |
|----------|-----------|---------|
| **Runtime** | Node.js 18+ | JavaScript runtime |
| **Framework** | Express.js 4.x | Web application framework |
| **Database** | MongoDB 6+ | Primary database |
| **ODM** | Mongoose 7.x | MongoDB object modeling |
| **Cache** | Redis 7+ | In-memory caching |
| **Authentication** | JWT + Steam OpenID | User authentication |
| **Testing** | Jest, Playwright, Artillery | Unit, E2E, Performance tests |

### Development Tools
| Category | Technology | Purpose |
|----------|-----------|---------|
| **Package Manager** | npm 9+ | Dependency management |
| **CI/CD** | GitHub Actions | Automated testing and deployment |
| **Containerization** | Docker, Docker Compose | Development and production containers |
| **Linting** | ESLint + Prettier | Code quality and formatting |
| **Documentation** | Swagger/OpenAPI | API documentation |
| **Monitoring** | Prometheus, Grafana | Metrics and dashboards |
| **Logging** | Winston | Structured logging |

### External Services
| Service | Purpose |
|---------|---------|
| **Steam API** | User authentication, inventory, pricing |
| **Stripe** | Payment processing |
| **MongoDB Atlas** | Cloud database (production) |
| **Redis Cloud** | Cloud Redis (production) |
| **Sentry** | Error tracking |
| **Slack** | Notifications and alerts |

## ⚙️ Development Environment Setup

### Prerequisites

Install these tools on your machine:

1. **Node.js 18+**
   ```bash
   # Using nvm (recommended)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   ```

2. **npm 9+** (comes with Node.js)
   ```bash
   npm --version
   ```

3. **Git**
   ```bash
   git --version
   ```

4. **Docker & Docker Compose**
   ```bash
   # macOS (using Homebrew)
   brew install docker docker-compose

   # Ubuntu
   sudo apt-get update
   sudo apt-get install docker.io docker-compose
   ```

5. **MongoDB** (for local development)
   ```bash
   # macOS
   brew install mongodb/brew/mongodb-community

   # Ubuntu
   sudo apt-get install -y mongodb
   ```

6. **Redis**
   ```bash
   # macOS
   brew install redis

   # Ubuntu
   sudo apt-get install redis-server
   ```

### Initial Setup

**Step 1: Clone the Repository**
```bash
git clone https://github.com/your-org/steam-marketplace.git
cd steam-marketplace
```

**Step 2: Install Dependencies**
```bash
npm install
```

**Step 3: Environment Configuration**
```bash
# Copy environment template
cp .env.example .env

# Edit with your values
nano .env
```

Required environment variables:
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/steam_marketplace

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets (generate secure random strings)
JWT_ACCESS_SECRET=your-super-secret-access-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
SESSION_SECRET=your-session-secret

# Steam API
STEAM_API_KEY=your-steam-api-key

# External Services
STRIPE_SECRET_KEY=sk_test_your_stripe_key
SENTRY_DSN=your-sentry-dsn
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Development
NODE_ENV=development
LOG_LEVEL=debug
```

**Step 4: Start Services**

Using Docker Compose (recommended):
```bash
docker-compose up -d mongodb redis
```

Or manually:
```bash
# Start MongoDB
mongod --dbpath /usr/local/var/mongodb

# Start Redis
redis-server
```

**Step 5: Initialize Database**
```bash
# Run database initialization (if any)
npm run db:init

# Load sample data (optional)
npm run db:seed
```

**Step 6: Start the Application**
```bash
# Development mode with hot reload
npm run dev

# Or production mode
npm start
```

**Step 7: Verify Setup**
```bash
# Check if API is running
curl http://localhost:3001/health

# Check metrics
curl http://localhost:3001/api/metrics/summary

# View Swagger documentation
open http://localhost:3001/api-docs
```

If everything is working, you should see:
- Health check returns `{"status": "healthy"}`
- Application starts on port 3001
- Swagger UI accessible at `/api-docs`

## 📁 Project Structure

```
steam-marketplace/
├── .github/              # GitHub Actions workflows
├── .vscode/              # VS Code settings
├── config/               # Configuration files
│   ├── sentry.js         # Error tracking config
│   ├── swagger.js        # API documentation config
│   └── ...
├── controllers/          # HTTP request handlers
├── docs/                 # Documentation
│   ├── adr/              # Architecture decision records
│   └── ...
├── middleware/           # Express middleware
├── models/               # Mongoose schemas
├── monitoring/           # Prometheus, Grafana configs
├── public/               # Static files
├── repositories/         # Data access layer
├── routes/               # API routes
├── services/             # Business logic
├── tests/                # Test files
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── e2e/              # End-to-end tests
│   └── ...
├── use-cases/            # Business use cases
├── utils/                # Utility functions
│   ├── logger.js         # Logging configuration
│   └── ...
├── app.js                # Application entry point
├── server.js             # Server initialization
├── package.json          # Dependencies and scripts
└── docker-compose.yml    # Docker services
```

### Key Directories

- **`routes/`** - Express route definitions
- **`controllers/`** - Request/response handling
- **`services/`** - External service integrations
- **`repositories/`** - Data access layer
- **`models/`** - Mongoose schemas
- **`use-cases/`** - Business logic
- **`middleware/`** - Cross-cutting concerns
- **`tests/`** - All test files

## 🧠 Core Concepts

### Clean Architecture

We follow Clean Architecture principles with clear separation of concerns:

```
┌─────────────────────────────────────┐
│           Controllers               │
│  (HTTP Request/Response Handling)   │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│          Use Cases                  │
│      (Business Logic)               │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│       Repositories                  │
│        (Data Access)                │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│          Services                   │
│    (External APIs, Stripe, etc.)    │
└─────────────────────────────────────┘
```

**Key Principles:**
1. **Independence**: Business logic doesn't depend on external services
2. **Testability**: Easy to unit test business logic without database
3. **Flexibility**: Can swap data sources or frameworks easily
4. **Clear Boundaries**: Each layer has a specific responsibility

### Repository Pattern

We use the Repository Pattern to abstract data access:

```javascript
// Interface
class IUserRepository {
  async findById(id) { throw new Error('Not implemented'); }
  async findBySteamId(steamId) { throw new Error('Not implemented'); }
  async save(user) { throw new Error('Not implemented'); }
}

// Implementation
class MongoUserRepository extends IUserRepository {
  async findById(id) {
    return await User.findById(id);
  }
}

// Usage
const userRepository = new MongoUserRepository();
const user = await userRepository.findById(userId);
```

**Benefits:**
- Testability (mock repositories)
- Flexibility (swap databases)
- Single responsibility
- Clear contracts

### DTO Pattern

Data Transfer Objects separate API schemas from business entities:

```javascript
// Request DTO (validates input)
class CreateListingDTO {
  constructor(data) {
    this.itemName = data.itemName;
    this.price = data.price;
  }

  validate() {
    if (!this.itemName || !this.price) {
      throw new Error('Invalid listing data');
    }
  }
}

// Response DTO (controls output)
class ListingResponseDTO {
  constructor(listing) {
    this.id = listing._id;
    this.itemName = listing.itemName;
    this.price = listing.price;
    this.seller = listing.seller.username;
  }
}

// Usage
const createListingDTO = new CreateListingDTO(req.body);
createListingDTO.validate();

const listing = await createListingUseCase.execute(createListingDTO);
res.json(new ListingResponseDTO(listing));
```

### JWT Authentication Flow

```
1. Client → /api/auth/steam (Login with Steam)
2. Server → Verify Steam ticket
3. Server → Issue JWT access token (15 min) + refresh token (7 days)
4. Client → Store tokens
5. Client → Use access token for API calls
6. When expired → Use refresh token to get new access token
7. Refresh token rotates (new one issued each use)
```

## 🔄 Development Workflow

### Git Workflow

We use **GitHub Flow** with feature branches:

1. **Create Feature Branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/add-user-avatar
   ```

2. **Make Changes**
   ```bash
   # Write code
   # Run tests
   # Commit frequently
   git add .
   git commit -m "feat: add user avatar display"
   ```

3. **Push and Create PR**
   ```bash
   git push origin feature/add-user-avatar
   # Create PR on GitHub
   ```

4. **Code Review**
   - At least 1 approval required
   - All CI checks must pass
   - Address feedback

5. **Merge**
   - Squash and merge to main
   - Delete feature branch

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(marketplace): add listing search functionality
fix(auth): resolve JWT expiration issue
docs(api): update Swagger documentation
refactor(database): optimize user query
test(marketplace): add unit tests for listing service
```

### Pull Request Process

1. **Before Opening PR:**
   - [ ] Run full test suite: `npm test`
   - [ ] Run linting: `npm run lint`
   - [ ] Check coverage: `npm run test:coverage`
   - [ ] Test locally: `npm run dev`
   - [ ] Update documentation

2. **PR Description Template:**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Comments added for complex code
   - [ ] Documentation updated
   ```

3. **After PR Merged:**
   - [ ] Delete feature branch
   - [ ] Update relevant documentation
   - [ ] Monitor deployment

## 🧪 Testing

### Test Structure

```
tests/
├── unit/                 # Unit tests
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   └── utils/
├── integration/          # Integration tests
│   ├── auth.test.js
│   ├── marketplace.test.js
│   └── ...
├── e2e/                  # End-to-end tests
│   ├── auth.spec.js
│   └── ...
├── fixtures/             # Test data
└── mocks/                # Mock objects
```

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Writing Unit Tests

Use Jest for unit tests:

```javascript
// tests/unit/services/userService.test.js
const UserService = require('../../../services/userService');
const MockUserRepository = require('../../mocks/userRepository');

describe('UserService', () => {
  let userService;
  let mockRepo;

  beforeEach(() => {
    mockRepo = new MockUserRepository();
    userService = new UserService(mockRepo);
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      // Arrange
      const userId = '123';
      const expectedUser = { _id: userId, username: 'testuser' };
      mockRepo.findById.mockResolvedValue(expectedUser);

      // Act
      const result = await userService.findById(userId);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockRepo.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw error when user not found', async () => {
      // Arrange
      mockRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.findById('456'))
        .rejects
        .toThrow('User not found');
    });
  });
});
```

### Integration Testing

```javascript
// tests/integration/auth.test.js
const request = require('supertest');
const app = require('../../../app');
const User = require('../../../models/User');

describe('Auth Integration', () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/login', () => {
    it('should login user with valid Steam ticket', async () => {
      // This would test the full flow
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          steamId: '76561198000000000',
          ticket: 'valid-steam-ticket'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
    });
  });
});
```

### E2E Testing

```javascript
// tests/e2e/auth.spec.js
const { test, expect } = require('@playwright/test');

test('user can login and view listings', async ({ page }) => {
  // Navigate to login
  await page.goto('/login');

  // Login with Steam
  await page.click('button:has-text("Login with Steam")');

  // Should be redirected to marketplace
  await expect(page).toHaveURL('/marketplace');

  // Check if listings are displayed
  await expect(page.locator('.listing-item')).toBeVisible();

  // Take screenshot
  await page.screenshot({ path: 'marketplace.png' });
});
```

### Test Data

Use factories for consistent test data:

```javascript
// tests/factories/userFactory.js
const User = require('../../../models/User');

class UserFactory {
  static create(overrides = {}) {
    return {
      steamId: '76561198000000000',
      username: 'testuser',
      wallet: { balance: 100 },
      ...overrides
    };
  }

  static async createInDB(overrides = {}) {
    const userData = this.create(overrides);
    const user = new User(userData);
    return await user.save();
  }
}

module.exports = UserFactory;
```

## 🗄️ Database

### MongoDB Schema Design

Example: User Model

```javascript
// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  steamId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  wallet: {
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' }
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ steamId: 1 });

module.exports = mongoose.model('User', userSchema);
```

### Queries

```javascript
// Find user by Steam ID
const user = await User.findOne({ steamId: '76561198000000000' });

// Find active listings with price range
const listings = await Listing.find({
  status: 'active',
  'price.amount': { $gte: 10, $lte: 100 }
}).populate('seller', 'username');

// Aggregation example - top sellers
const topSellers = await Listing.aggregate([
  { $match: { status: 'active' } },
  { $group: { _id: '$seller', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 10 },
  { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'seller' } }
]);
```

### Migrations

For schema changes, use Mongoose migrations:

```javascript
// migrations/001-add-user-reputation.js
module.exports = {
  async up(db) {
    await db.collection('users').updateMany(
      {},
      {
        $set: {
          reputation: {
            positive: 0,
            negative: 0,
            total: 0
          }
        }
      }
    );
  },

  async down(db) {
    await db.collection('users').updateMany(
      {},
      { $unset: { reputation: "" } }
    );
  }
};
```

Run migrations:
```bash
npm run migrate
```

### Data Seeding

```javascript
// scripts/seed.js
const User = require('../models/User');

async function seed() {
  await User.deleteMany({});
  await User.create([
    { steamId: '111', username: 'user1' },
    { steamId: '222', username: 'user2' }
  ]);
  console.log('Database seeded');
}

seed().then(() => process.exit(0));
```

## 📖 API Documentation

### Swagger UI

API documentation is available at:
- Development: http://localhost:3001/api-docs
- Production: https://api.sgomarket.com/api-docs

### API Usage Example

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "steamId": "76561198000000000",
    "ticket": "steam-auth-ticket"
  }'

# Get listings (use token from login)
curl -X GET http://localhost:3001/api/marketplace/listings \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Adding New Endpoints

Use JSDoc comments in route files:

```javascript
// routes/marketplace.js

/**
 * @swagger
 * /api/marketplace/listings:
 *   get:
 *     summary: Get marketplace listings
 *     description: Returns a list of active marketplace listings
 *     tags: [Marketplace]
 *     parameters:
 *       - in: query
 *         name: game
 *         schema:
 *           type: string
 *           enum: [csgo, cs2]
 *         description: Filter by game
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price
 *     responses:
 *       200:
 *         description: List of listings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MarketListing'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/listings', authenticateToken, async (req, res) => {
  // Implementation
});
```

## 🐛 Debugging

### Logging

We use Winston for structured logging:

```javascript
const logger = require('../utils/logger');

// Basic logging
logger.info('User logged in', { userId: '123' });
logger.error('Database error', { error: err.message });

// Specialized methods
logger.logAuth('login', userId, 'success', { ip: '192.168.1.1' });
logger.security('Suspicious activity', { source: 'api', ip: '192.168.1.1' });
logger.performance('Database query', 150, { query: 'findUser' });
```

View logs:
```bash
# All logs
tail -f logs/combined.log

# Error logs only
tail -f logs/error.log

# Security logs
tail -f logs/security.log
```

### Debugging Node.js

```bash
# Run with debugger
node --inspect app.js

# VS Code debug configuration (.vscode/launch.json):
{
  "type": "node",
  "request": "launch",
  "name": "Debug App",
  "program": "${workspaceFolder}/app.js",
  "env": { "NODE_ENV": "development" }
}
```

### Database Debugging

```javascript
// Enable Mongoose query logging
mongoose.set('debug', true);

// Add to app.js during development
if (process.env.NODE_ENV === 'development') {
  mongoose.set('debug', true);
}
```

### Testing Specific Function

```javascript
// test-utils.js
const testFunction = async () => {
  console.log('Testing...');
};

// Quick test
const result = await testFunction();
console.log(result);
```

## 🤝 Contributing Guidelines

### Code Style

- **ESLint**: Automatic linting enforced
- **Prettier**: Automatic code formatting
- **No semicolons**: Use ESLint config
- **Trailing commas**: In objects and arrays
- **Single quotes**: For strings

### Best Practices

1. **Small PRs**: Keep changes focused and small
2. **Descriptive commits**: Clear commit messages
3. **Tests**: Write tests for new features
4. **Documentation**: Update docs for changes
5. **No console.log**: Use logger instead
6. **Error handling**: Always handle errors
7. **Async/await**: Use async/await over callbacks
8. **Type checking**: Use JSDoc for complex functions

### Code Review Checklist

**For Reviewers:**
- [ ] Code is readable and well-commented
- [ ] Tests are included and passing
- [ ] No security vulnerabilities
- [ ] Performance is acceptable
- [ ] Follows architecture patterns
- [ ] Documentation is updated

**For Authors:**
- [ ] Self-review before requesting review
- [ ] Respond to feedback promptly
- [ ] Squash commits if needed
- [ ] Update PR description with changes
- [ ] Ensure CI passes

## 🎯 Common Tasks

### Create a New Feature

1. **Create branch**: `git checkout -b feature/my-new-feature`
2. **Add route**: Create file in `routes/`
3. **Add controller**: Create file in `controllers/`
4. **Add service**: Create file in `services/`
5. **Add repository**: Create file in `repositories/`
6. **Write tests**: Add to appropriate test directory
7. **Update Swagger**: Add JSDoc comments
8. **Test locally**: Run full test suite
9. **Create PR**: Submit for review

### Fix a Bug

1. **Create issue**: Document the bug
2. **Create branch**: `git checkout -b fix/bug-description`
3. **Write test**: Add test that reproduces bug
4. **Fix code**: Implement the fix
5. **Verify**: Test passes
6. **Create PR**: Submit fix

### Add Database Field

1. **Update schema**: Modify Mongoose model
2. **Create migration**: Add migration script
3. **Update DTOs**: Modify request/response DTOs
4. **Update tests**: Add tests for new field
5. **Update docs**: Update Swagger documentation

### Performance Optimization

1. **Identify**: Use profiling tools
   ```bash
   # Profile Node.js
   node --prof app.js
   node --prof-process isolate-*.log > profile.txt
   ```

2. **Measure**: Use metrics service
   ```javascript
   logger.performance('expensive-operation', duration, {
     operation: 'database-query',
     records: count
   });
   ```

3. **Optimize**: Add indexes, caching, etc.
4. **Verify**: Re-measure performance
5. **Document**: Add ADR if significant

## 🛠️ Troubleshooting

### Common Issues

**Issue: MongoDB connection failed**
```bash
# Check if MongoDB is running
ps aux | grep mongod

# Start MongoDB
mongod

# Check connection string in .env
```

**Issue: Redis not connecting**
```bash
# Check Redis status
redis-cli ping
# Should return: PONG

# Start Redis
redis-server
```

**Issue: Port already in use**
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>
```

**Issue: Tests failing**
```bash
# Run specific test
npm test -- --testNamePattern="user login"

# Check coverage
npm run test:coverage
```

**Issue: Steam API errors**
- Check API key is valid
- Verify Steam service is accessible
- Check rate limits

**Issue: JWT token invalid**
- Check token expiration
- Verify secret keys in .env
- Clear browser storage/cookies

### Getting Help

1. **Check logs**: Look in `logs/` directory
2. **Run diagnostics**: `npm run health-check`
3. **Ask in Slack**: #development channel
4. **Create issue**: On GitHub
5. **Read docs**: API docs, ADRs, etc.

## 📚 Resources

### Documentation
- [API Documentation](http://localhost:3001/api-docs)
- [Architecture Decisions](docs/adr/README.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Monitoring Setup](monitoring/README.md)

### Internal Resources
- [Slack Channel](https://yourorg.slack.com/channels/development)
- [GitHub Repository](https://github.com/yourorg/steam-marketplace)
- [Confluence Wiki](https://yourorg.atlassian.net/wiki/steam-marketplace)

### External Resources
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Manual](https://docs.mongodb.com/)
- [Mongoose Docs](https://mongoosejs.com/docs/)
- [Jest Testing](https://jestjs.io/docs/getting-started)
- [Playwright](https://playwright.dev/docs/intro)

### Learning Materials
- [Clean Architecture](https://8thlight.com/blog/abhishek-tiwari/2014/12/09/clean-architecture-for-rails-applications/)
- [JWT Authentication](https://jwt.io/introduction/)
- [Redis Documentation](https://redis.io/documentation)

## 🎓 Next Steps

### Week 1 Goals
- [ ] Complete environment setup
- [ ] Make your first commit
- [ ] Review 3 pull requests
- [ ] Fix your first bug
- [ ] Understand the architecture

### Month 1 Goals
- [ ] Ship your first feature
- [ ] Contribute to all major components
- [ ] Present in team demo
- [ ] Mentor new team member
- [ ] Propose an architectural improvement

## 🤗 Need Help?

**Your buddy**: You'll be assigned a mentor for your first month
**Team Lead**: Available for architectural questions
**Slack**: #development for quick questions
**Documentation**: Always up to date in the repo

## 🎉 Welcome Aboard!

We're thrilled to have you on the team! Don't hesitate to ask questions - we all started somewhere, and we're here to help you succeed.

Happy coding! 🚀

---

**Last Updated**: 2024-01-15
**Version**: 2.0.0
