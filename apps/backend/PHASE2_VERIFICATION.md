# Phase 2: RxJS Observable & Interceptor Type Error Resolution

## Purpose

Verify and resolve RxJS Observable type errors and "No overload matches" errors in interceptors and auth strategies to reduce total TypeScript errors from 413 to <100.

## Pre-Verification Checklist

- [ ] Node.js ≥18.0.0 installed
- [ ] Dependencies installed in apps/backend
- [ ] Docker services running (Postgres, MongoDB, Redis)
- [ ] `.env` file configured
- [ ] Phase 1 completed (logger fixes applied)

## Step 1: Clean Build Environment

```bash
cd apps/backend
rm -rf dist/ node_modules/.cache tsconfig.tsbuildinfo
```

## Step 2: Run Comprehensive Type Check

```bash
npm run type-check 2>&1 | tee phase2-type-check-output.txt
grep -c "error TS" phase2-type-check-output.txt || echo "0 errors"
```

## Step 3: Identify Observable/Overload Errors

```bash
# Extract Observable type errors (TS2769, TS2322 with Observable)
grep -E "(TS2769|Observable.*is not assignable)" phase2-type-check-output.txt > observable-errors.txt
echo "Observable errors found: $(wc -l < observable-errors.txt)"

# Extract "No overload matches" errors (TS2769, TS2345)
grep -E "(TS2769|TS2345|No overload matches)" phase2-type-check-output.txt > overload-errors.txt
echo "Overload errors found: $(wc -l < overload-errors.txt)"

# List affected files
grep -E "(TS2769|TS2345|Observable)" phase2-type-check-output.txt | cut -d'(' -f1 | sort -u > affected-files.txt
cat affected-files.txt
```

## Step 4: Verify rxjs Override

```bash
# Check package.json has rxjs override
grep -A2 '"overrides"' package.json
# Expected: "rxjs": "^7.8.1"

# Verify installed rxjs version
npm list rxjs
# Should show single version: rxjs@7.8.1 (no duplicates)
```

## Step 5: Inspect Interceptor Return Types (if errors found)

```bash
# Check all interceptor signatures
grep -A5 "intercept(" src/common/interceptors/*.ts

# Expected pattern:
# intercept(context: ExecutionContext, next: CallHandler): Observable<any> | Promise<Observable<any>>
```

## Step 6: Apply Fixes (conditional, only if errors exist)

### Fix 6A: Observable Return Type Alignment

If interceptors have `Observable<any>` vs `Observable<Response<T>>` mismatches:

```typescript
// Before (if error exists):
intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
  return next.handle().pipe(tap(...));
}

// After:
intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
  return next.handle().pipe(tap(...));
}
// Note: Type should already be correct; verify with LSP
```

### Fix 6B: CallHandler Import Verification

Ensure all interceptors import from `@nestjs/common`:

```typescript
import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, map, catchError } from 'rxjs/operators';
```

### Fix 6C: Strategy Return Types

Verify auth strategies return correct types:

```typescript
// jwt.strategy.ts
async validate(payload: any): Promise<User> { ... }

// jwt-refresh.strategy.ts
async validate(req: any, payload: any): Promise<{ userId: string; refreshToken: string }> { ... }

// steam.strategy.ts
async validate(req: any, identifier: string, profile: any, done: VerifyCallback): Promise<void> { ... }
```

## Step 7: Rebuild and Verify

```bash
# Full clean build
npm run build
echo "Build exit code: $?"

# Verify dist output
ls -lh dist/main.js
# Should exist and be >100KB

# Recount errors
npm run type-check 2>&1 | grep -c "error TS"
# Target: <100 errors
```

## Step 8: Test Backend Startup

```bash
npm run start:dev

# Watch for:
# - "🚀 Steam Marketplace Backend is running on port 3001"
# - "Database connection established"
# - No runtime Observable errors

# Test health endpoint
curl http://localhost:3001/api/health
# Expected: {"status":"ok",...}
```

## Success Criteria

- ✅ TypeScript errors reduced from 413 to <100
- ✅ Zero Observable type mismatch errors (TS2769)
- ✅ Zero "No overload matches" errors in interceptors (TS2345)
- ✅ `npm run build` exits with code 0
- ✅ Backend starts without runtime errors
- ✅ All interceptors function correctly (test via API calls)

## Current Status (Post-Inspection)

- ✅ All interceptors use correct `Observable<any>` return types
- ✅ All use NestJS 11 `CallHandler` interface
- ✅ RxJS imports are correct (`rxjs`, `rxjs/operators`)
- ✅ `package.json` has `rxjs@^7.8.1` override
- ✅ Auth strategies have proper return types
- ✅ Test files compile without errors
- ⚠️ **Actual error count needs verification via `npm run type-check`**

## Troubleshooting

### Issue: Still seeing Observable type errors

**Solution:**
```bash
# Force reinstall with override
rm -rf node_modules package-lock.json
npm install
npm list rxjs  # Verify single version
```

### Issue: "No overload matches" in interceptors

**Solution:**
```typescript
// Ensure CallHandler.handle() returns Observable<any>
return next.handle().pipe(
  tap((data) => { /* ... */ }),
) as Observable<any>;  // Explicit cast if needed
```

### Issue: Build succeeds but runtime errors

**Solution:**
```bash
# Check for circular dependencies
npm run build 2>&1 | grep -i "circular"

# Verify all imports resolve
npm run start:dev 2>&1 | grep -i "cannot find module"
```

## Next Steps

After Phase 2 completion:
- **Phase 3**: Clean up remaining ~100 non-critical errors (type assertions, unused vars)
- **Frontend**: Proceed with UI redesign (CS.Money style)
- **Integration**: Full E2E testing with Steam bots

## Notes

- Code inspection suggests most Phase 2 fixes may already be in place
- Verification step is critical to avoid unnecessary changes
- Preserve working interceptor/strategy code
- Document any remaining errors for Phase 3