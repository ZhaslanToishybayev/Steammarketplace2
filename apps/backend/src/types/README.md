# Custom Type Definitions

This directory contains custom TypeScript type definitions and module augmentations used throughout the backend application.

## Overview

The types in this directory provide type safety for external libraries and global type extensions that are not covered by the standard `@types` packages. These definitions are automatically included by the TypeScript compiler due to the `include: ["src/**/*"]` setting in `tsconfig.json`.

## Available Type Definitions

### express.d.ts

**Purpose**: Global Express module augmentation to extend the Request interface with custom properties used throughout the application.

**Custom Properties Added**:
- `user?: User` - The authenticated user object (populated by authentication guards)
- `userId?: string` - Shorthand for user.id (populated by some guards)
- `sessionID?: string` - Session identifier for tracking (populated by session middleware)
- `route?: { path: string }` - Express route information (available on all HTTP requests)

**Usage**:
```typescript
import { Request } from 'express';

// The Request type now includes the custom properties
function handleRequest(req: Request) {
  const userId = req.user?.id; // Type-safe access
  const sessionId = req.sessionID; // Type-safe access
  const routePath = req.route?.path; // Type-safe access
}
```

**Relationship with RequestWithUser**: This file provides the global augmentation, while `src/common/interfaces/request-with-user.interface.ts` provides a stricter interface for contexts where user authentication is guaranteed.

### axios-retry.d.ts

**Purpose**: Type definitions for axios retry functionality.

**Usage**: These types extend the axios library to support retry configurations and options.

## Adding New Type Definitions

### Guidelines

1. **Naming Convention**: Use descriptive names that clearly indicate the purpose of the type definitions. For example:
   - `express.d.ts` for Express.js augmentations
   - `library-name.d.ts` for third-party library extensions
   - `custom-features.d.ts` for application-specific type definitions

2. **File Organization**: Group related type definitions in separate files rather than creating one large file.

3. **Documentation**: Include comprehensive JSDoc comments explaining:
   - The purpose of the type definitions
   - When and how to use them
   - Any dependencies or prerequisites
   - Examples of usage

4. **Import Structure**: Use proper import statements for any dependencies:
   ```typescript
   import { User } from '../modules/auth/entities/user.entity';
   ```

### Creating a New Type Definition File

1. **Create the file** with a `.d.ts` extension in this directory
2. **Add appropriate imports** for any dependencies
3. **Include comprehensive documentation** with JSDoc comments
4. **Follow the existing patterns** for module augmentation or interface extension
5. **Test the types** by using them in actual code and running the TypeScript compiler

### Module Augmentation Pattern

For extending existing libraries (like Express):

```typescript
// Import any necessary types
import { User } from '../path/to/user.entity';

// Declare the module augmentation
declare module 'library-name' {
  export interface InterfaceToExtend {
    customProperty: CustomType;
  }
}
```

### Interface Extension Pattern

For creating new interfaces based on existing ones:

```typescript
import { BaseInterface } from 'library-name';

export interface ExtendedInterface extends BaseInterface {
  customProperty: CustomType;
}
```

## Troubleshooting

### Common Issues

1. **Types Not Being Picked Up**:
   - Ensure the file has a `.d.ts` extension
   - Verify the file is in the `src/types/` directory
   - Check that `tsconfig.json` includes the directory with `include: ["src/**/*"]`
   - Restart your IDE or TypeScript service

2. **Type Conflicts**:
   - Check for duplicate declarations
   - Ensure you're not redeclaring types that already exist
   - Use `declare module` for augmentations rather than creating new interfaces with the same name

3. **Import Errors**:
   - Verify import paths are correct
   - Ensure dependent files exist and are properly exported
   - Check for circular dependencies

### IDE Integration

Most modern IDEs will automatically recognize and provide IntelliSense for type definitions in this directory. If you're not seeing type information:

1. **Restart the TypeScript service** in your IDE
2. **Clear TypeScript cache** if available
3. **Check IDE settings** for TypeScript support
4. **Verify the TypeScript version** being used

## Best Practices

1. **Keep type definitions focused** - each file should have a clear, single purpose
2. **Document thoroughly** - include usage examples and explanations
3. **Test with real code** - ensure types work as expected in practice
4. **Keep up-to-date** - update type definitions when the underlying libraries or interfaces change
5. **Use strict typing** - prefer specific types over `any` when possible

## References

- [TypeScript Module Augmentation Documentation](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)
- [NestJS Type Safety Guide](https://docs.nestjs.com/recipes/type-safety)
- [Express.js TypeScript Types](https://expressjs.com/en/advanced/typescript.html)