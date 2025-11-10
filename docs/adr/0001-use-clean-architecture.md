# ADR-0001: Adopt Clean Architecture

## Status
**Accepted** - 2024-01-01

## Context
We are building a Steam Marketplace application that needs to be maintainable, testable, and scalable. The initial codebase was showing signs of tight coupling, making it difficult to test individual components and swap out dependencies. We need a clear separation of concerns to support long-term maintainability and facilitate team collaboration.

## Decision
We will adopt **Clean Architecture** principles with the following structure:

```
src/
├── entities/          # Business objects (User, Listing, Trade)
├── use-cases/         # Business logic (BuyItem, CreateListing)
├── controllers/       # HTTP handlers
├── repositories/      # Data access interfaces
├── services/          # External services (SteamAPI, Payment)
└── middleware/        # Cross-cutting concerns
```

**Repository Pattern** will be implemented to decouple business logic from data access:
- Interfaces define contracts (IUserRepository)
- Implementations handle specific storage (MongoUserRepository)
- Dependency injection for testability

**DTOs** (Data Transfer Objects) will separate API schemas from business objects:
- Request DTOs for input validation
- Response DTOs for API contracts
- Business entities remain pure

## Consequences

### Positive
- **Testability**: Business logic can be unit tested without database or HTTP
- **Maintainability**: Clear separation makes code easier to understand
- **Flexibility**: Can swap data sources (MongoDB → PostgreSQL) without business changes
- **Scalability**: Can add new interfaces (GraphQL, gRPC) without refactoring
- **Team Collaboration**: Well-defined boundaries enable parallel development

### Negative
- **Initial Complexity**: More files and indirection for simple operations
- **Learning Curve**: Team needs to understand clean architecture principles
- **Boilerplate**: More interfaces and DTOs to maintain

## Implementation

### Example: User Repository

```javascript
// entities/User.js
class User {
  constructor(id, steamId, username) {
    this.id = id;
    this.steamId = steamId;
    this.username = username;
  }
}

// repositories/IUserRepository.js
class IUserRepository {
  async findById(id) { throw new Error('Not implemented'); }
  async findBySteamId(steamId) { throw new Error('Not implemented'); }
  async save(user) { throw new Error('Not implemented'); }
}

// repositories/MongoUserRepository.js
class MongoUserRepository extends IUserRepository {
  constructor(db) {
    super();
    this.collection = db.collection('users');
  }

  async findById(id) {
    const data = await this.collection.findOne({ _id: id });
    return data ? new User(data._id, data.steamId, data.username) : null;
  }
}

// use-cases/GetUserUseCase.js
class GetUserUseCase {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute(userId) {
    return await this.userRepository.findById(userId);
  }
}
```

### Dependency Injection Container

```javascript
// di/container.js
const container = {
  userRepository: new MongoUserRepository(db),
  getUserUseCase: new GetUserUseCase(container.userRepository)
};

// controllers/userController.js
const getUser = async (req, res) => {
  const user = await container.getUserUseCase.execute(req.params.id);
  res.json(user);
};
```

## Alternatives Considered

### Option 1: Simple MVC
- **Pros**: Simpler for small projects
- **Cons**: Tight coupling, hard to test, not scalable
- **Rejected because**: Not suitable for marketplace with complex business logic

### Option 2: Hexagonal Architecture
- **Pros**: Similar benefits to Clean Architecture
- **Cons**: Different terminology, less widely adopted in JS community
- **Rejected because**: Clean Architecture is more common in Node.js ecosystem

### Option 3: Microservices
- **Pros**: Independent scaling, team autonomy
- **Cons**: Operational complexity, data consistency challenges
- **Rejected because**: Project size doesn't justify complexity yet

## Related Decisions
- [ADR-0002: Use MongoDB with Mongoose ODM](0002-use-mongodb.md)
- [ADR-0003: Implement JWT Authentication](0003-jwt-auth.md)
- [ADR-0004: Adopt Repository Pattern](0004-repository-pattern.md)

## References
- Clean Architecture by Robert C. Martin
- https://8thlight.com/blog/abhishek-tiwari/2014/12/09/clean-architecture-for-rails-applications/
- https://github.com/jasongriffith/clean-node-api
