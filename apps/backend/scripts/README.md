# Phase 3 TypeScript Fix Scripts

## Overview

Automated tools for resolving remaining TypeScript compilation errors in Phase 3. These scripts provide systematic approaches to fix missing imports, unused variables, and type assertion issues.

## Scripts

### 1. phase3-fix-imports.ts

**Purpose**: Identify and fix missing import statements

**Usage**:
```bash
ts-node scripts/phase3-fix-imports.ts [--apply]
```

**Options**:
- No flag: Dry run (preview only)
- `--apply`: Apply fixes to files

**Output**: JSON report with suggested imports including:
- File path and line number
- Missing module/name
- Suggested import statement
- Confidence level (high/medium/low)
- Export location

**Confidence Levels**:
- **High**: Single matching export found in codebase
- **Medium**: Multiple matching exports found
- **Low**: No matching export found (suggests external module)

**Example Output**:
```
📁 src/modules/auth/auth.service.ts:
  ✅ import { AuthService } from './auth.service'; (high)
  ⚠️  import { AuthConfig } from '@config/auth'; (medium)
  ❌ import { ExternalLib } from 'external-lib'; (low)
```

### 2. phase3-fix-unused-vars.ts

**Purpose**: Handle unused variable/parameter errors

**Usage**:
```bash
ts-node scripts/phase3-fix-unused-vars.ts [--dry-run|--apply|--restore --file=path]
```

**Options**:
- `--dry-run`: Preview only (default)
- `--apply`: Apply fixes to files
- `--restore --file=path`: Restore from backup

**Fix Types**:
- **Function parameters**: Prefix with `_` (e.g., `param` → `_param`)
- **Local variables**: Add `// eslint-disable-next-line @typescript-eslint/no-unused-vars`
- **Unused imports**: Comment out with `// ` prefix

**Safety Features**:
- Creates `.backup` files before modifications
- Can restore from backup with `--restore` flag
- Preserves original formatting and comments

**Example Output**:
```
🔧 username (parameter): username → _username
📝 userId (variable): + // eslint-disable-next-line @typescript-eslint/no-unused-vars
❌ import { unused } from './module'; → // import { unused } from './module';
```

### 3. phase3-add-type-assertions.ts

**Purpose**: Add temporary `as any` assertions for complex type errors

**Usage**:
```bash
ts-node scripts/phase3-add-type-assertions.ts [--preview|--apply]
```

**Options**:
- `--preview`: Preview only (default)
- `--apply`: Apply assertions to files

**Assertion Types**:
- **Assignment errors**: Wrap right-hand side with `as any`
- **Argument errors**: Wrap function arguments with `as any`
- **Return errors**: Wrap return values with `as any`

**Documentation**:
Each assertion includes a TODO comment:
```typescript
// TODO: Fix type - Phase 3 temporary assertion (TS2322: Type 'X' is not assignable to type 'Y')
const result = someComplexOperation() as any;
```

**Warning**: This is a temporary solution. All assertions should be reviewed and properly typed in future phases.

## Workflow

### Recommended Execution Order

1. **Run each script in preview mode first**:
   ```bash
   npm run phase3:fix-imports
   npm run phase3:fix-unused
   npm run phase3:add-assertions
   ```

2. **Review suggested changes**:
   - Check confidence levels for import fixes
   - Verify unused variable categorizations
   - Review type assertion placements

3. **Apply fixes**:
   ```bash
   npm run phase3:fix-imports:apply
   npm run phase3:fix-unused:apply
   npm run phase3:add-assertions:apply  # If needed
   ```

4. **Verify with type-check**:
   ```bash
   npm run type-check
   ```

5. **Repeat until build succeeds**:
   ```bash
   npm run build
   ```

### Complete Automated Workflow

```bash
# Run full Phase 3 workflow
npm run phase3:full
```

This executes:
1. Count current errors
2. Apply import fixes
3. Apply unused variable fixes
4. Verify build success

## Best Practices

### Before Running Scripts
1. **Commit your changes**: Ensure you have a clean git state
2. **Backup important work**: Scripts create `.backup` files, but git is safer
3. **Review error categories**: Use `npm run phase3:categorize` to understand error distribution

### During Execution
1. **Start with dry runs**: Always preview changes before applying
2. **Review confidence levels**: High confidence import fixes are safer to apply
3. **Check file modifications**: Scripts report which files were changed

### After Execution
1. **Verify build success**: Run `npm run build` to confirm fixes worked
2. **Test functionality**: Start backend and check health endpoints
3. **Document remaining issues**: Note any warnings or TODOs for future cleanup

## Troubleshooting

### Script Execution Errors
- **Node.js version**: Ensure Node.js 18+ is installed
- **Dependencies**: Run `npm install` if modules are missing
- **Permissions**: Scripts need read/write access to TypeScript files

### Fix Application Issues
- **Backup restoration**: Use `--restore --file=path` to revert changes
- **Partial fixes**: Run scripts individually if full workflow fails
- **Manual intervention**: Some errors may require manual fixes

### Build Still Failing
- **Error analysis**: Run `npm run phase3:categorize` to see remaining errors
- **Manual fixes**: Review `phase3-errors.txt` for specific issues
- **Type assertion review**: Check for overuse of `as any` assertions

## File Structure

```
scripts/
├── phase3-fix-imports.ts        # Import error fixes
├── phase3-fix-unused-vars.ts    # Unused variable fixes
├── phase3-add-type-assertions.ts # Type assertion fixes
└── README.md                    # This documentation
```

## Dependencies

All scripts use Node.js built-in modules only:
- `fs` - File system operations
- `path` - Path manipulation
- `child_process` - TypeScript compilation
- No external dependencies required

## Safety Notes

⚠️ **Temporary Solutions**: Type assertions (`as any`) added by `phase3-add-type-assertions.ts` are temporary and should be reviewed post-launch.

⚠️ **Backup Verification**: Always verify `.backup` files are created before applying fixes.

⚠️ **Gradual Application**: Apply fixes incrementally rather than all at once to identify problematic changes.

⚠️ **Code Review**: Review all generated changes before committing to ensure they make sense in context.