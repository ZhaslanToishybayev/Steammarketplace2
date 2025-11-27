# Authentication Module

## User Entity Architecture

### Primary Key Design
The `User` entity uses **UUID v4** (`@PrimaryGeneratedColumn('uuid')`) for the `id` field, resulting in `id: string` type.

**Why UUID instead of auto-increment integers?**
- **Security**: Non-sequential IDs prevent enumeration attacks
- **Distributed systems**: UUIDs avoid ID collisions across multiple databases/services
- **Portability**: Works consistently across PostgreSQL, MySQL, MongoDB
- **Scalability**: No single point of failure for ID generation

### Type Consistency
All services, controllers, and DTOs **must** use `id: string` when referencing User IDs:

```typescript
// ✅ Correct
const userId: string = user.id;
await userRepository.findOne({ where: { id: userId } });

// ❌ Incorrect (will cause type errors)
const userId: number = user.id; // Type error!
```

### Import Patterns
Use relative imports for User entity:

```typescript
// From auth module
import { User } from './entities/user.entity';

// From sibling modules (e.g., wallet, trading)
import { User } from '../../auth/entities/user.entity';

// From nested modules (e.g., admin/services)
import { User } from '../../../auth/entities/user.entity';
```

### Validation
When accepting User IDs from external sources (API requests, webhooks), validate using:

```typescript
import { IsUUID } from 'class-validator';

class SomeDto {
  @IsUUID('4')
  userId: string;
}
```

### Common Pitfalls
1. **Don't cast to number**: `parseInt(user.id)` will fail
2. **Don't use auto-increment syntax**: `@PrimaryGeneratedColumn()` defaults to integer
3. **Don't compare with `===` to numbers**: `user.id === 123` is always false

### Migration Notes
If migrating from integer IDs:
1. Update all foreign keys to `varchar(36)` or `uuid` type
2. Regenerate TypeORM migrations
3. Update all API clients expecting numeric IDs

## Related Files
- Entity: `src/modules/auth/entities/user.entity.ts`
- DTOs: `src/modules/auth/dto/auth-response.dto.ts`
- Services: `src/modules/auth/services/auth.service.ts`
- Guards: `src/modules/auth/guards/*.guard.ts`