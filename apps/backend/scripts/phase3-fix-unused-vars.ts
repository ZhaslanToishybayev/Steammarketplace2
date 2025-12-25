#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface UnusedVariableError {
  file: string;
  line: number;
  variableName: string;
  errorCode: string;
  message: string;
  variableType: 'parameter' | 'variable' | 'import';
}

interface VariableFix {
  file: string;
  line: number;
  variableName: string;
  fixType: 'prefix_underscore' | 'eslint_disable' | 'comment_out' | 'remove';
  originalLine: string;
  fixedLine: string;
  context: string;
}

function runTypeCheck(): string {
  try {
    return execSync('npx tsc --noEmit --noUnusedParameters --noUnusedLocals src/test-unused.ts', { encoding: 'utf8', cwd: process.cwd() });
  } catch (error) {
    // TypeScript compilation errors are returned in stderr for tsc
    return (error as any).stderr || (error as any).stdout || '';
  }
}

function parseUnusedVariableErrors(output: string): UnusedVariableError[] {
  const errors: UnusedVariableError[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // Match TypeScript error format: file.ts(line,col): error TSxxxx: message
    const match = line.match(/^(.+\.ts)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)$/);
    if (match) {
      const [, file, line, column, errorCode, message] = match;
      if (errorCode === 'TS6133') {
        // TS6133: 'variable' is declared but its value is never read
        const variableMatch = message.match(/'([^']*)' is declared but its value is never read/);
        if (variableMatch) {
          const variableName = variableMatch[1];
          const lineNum = parseInt(line);

          // Determine variable type by examining the file
          const variableType = determineVariableType(file, lineNum, variableName);

          errors.push({
            file,
            line: lineNum,
            variableName,
            errorCode,
            message,
            variableType,
          });
        }
      }
    }
  }

  return errors;
}

function determineVariableType(file: string, line: number, variableName: string): 'parameter' | 'variable' | 'import' {
  try {
    const filePath = path.resolve(process.cwd(), file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const targetLine = lines[line - 1]; // Convert to 0-based index

    if (!targetLine) {
      return 'variable';
    }

    // Check if it's a function parameter
    if (targetLine.includes('(') && targetLine.includes(')')) {
      // Look for parameter patterns
      const paramPatterns = [
        new RegExp(`\\b${variableName}\\b\\s*:`), // parameter: type
        new RegExp(`\\(.*\\b${variableName}\\b.*\\)`), // in parentheses
      ];

      if (paramPatterns.some(pattern => pattern.test(targetLine))) {
        return 'parameter';
      }
    }

    // Check if it's an import
    if (targetLine.trim().startsWith('import')) {
      return 'import';
    }

    // Check if it's a variable declaration
    const varPatterns = [
      new RegExp(`\\b(?:const|let|var)\\s+\\b${variableName}\\b`), // const/let/var variable
      new RegExp(`\\b${variableName}\\b\\s*[=:].*`), // variable = value or variable: type
    ];

    if (varPatterns.some(pattern => pattern.test(targetLine))) {
      return 'variable';
    }

    return 'variable';

  } catch (error) {
    return 'variable';
  }
}

function generateVariableFixes(errors: UnusedVariableError[]): VariableFix[] {
  const fixes: VariableFix[] = [];

  for (const error of errors) {
    try {
      const filePath = path.resolve(process.cwd(), error.file);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const targetLine = lines[error.line - 1]; // Convert to 0-based index

      if (!targetLine) {
        continue;
      }

      let fixType: VariableFix['fixType'];
      let fixedLine: string;

      switch (error.variableType) {
        case 'parameter':
          // Prefix with underscore
          fixType = 'prefix_underscore';
          fixedLine = targetLine.replace(
            new RegExp(`\\b${error.variableName}\\b`), `_` + error.variableName
          );
          break;

        case 'variable':
          // Add eslint-disable comment above
          fixType = 'eslint_disable';
          fixedLine = targetLine;
          break;

        case 'import':
          // Comment out the import
          fixType = 'comment_out';
          fixedLine = `// ${targetLine.trim()}`;
          break;

        default:
          fixType = 'eslint_disable';
          fixedLine = targetLine;
      }

      fixes.push({
        file: error.file,
        line: error.line,
        variableName: error.variableName,
        fixType,
        originalLine: targetLine,
        fixedLine,
        context: error.variableType,
      });

    } catch (err) {
      console.error(`Failed to process file ${error.file}:`, err);
    }
  }

  return fixes;
}

function applyVariableFixes(fixes: VariableFix[]): void {
  const groupedFixes = groupFixesByFile(fixes);

  for (const [file, fileFixes] of Object.entries(groupedFixes)) {
    const filePath = path.resolve(process.cwd(), file);
    const backupPath = filePath + '.backup';

    try {
      // Create backup
      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, backupPath);
        console.log(`Created backup: ${backupPath}`);
      }

      let content = fs.readFileSync(filePath, 'utf8');
      let lines = content.split('\n');

      // Apply fixes in reverse order to maintain line numbers
      const sortedFixes = fileFixes.sort((a, b) => b.line - a.line);

      for (const fix of sortedFixes) {
        const lineIndex = fix.line - 1; // Convert to 0-based index

        if (fix.fixType === 'eslint_disable') {
          // Add eslint-disable comment above the line
          lines.splice(lineIndex, 0, `// eslint-disable-next-line @typescript-eslint/no-unused-vars`);
          // Update the original code line at lineIndex + 1 (after the comment)
          lines[lineIndex + 1] = fix.fixedLine;
        } else {
          // For non-eslint_disable fix types, only overwrite the original code line
          lines[lineIndex] = fix.fixedLine;
        }
      }

      // Write back to file
      fs.writeFileSync(filePath, lines.join('\n'));
      console.log(`Applied ${fileFixes.length} unused variable fixes to ${file}`);

    } catch (error) {
      console.error(`Failed to apply fixes to ${file}:`, error);
    }
  }
}

function groupFixesByFile(fixes: VariableFix[]): Record<string, VariableFix[]> {
  const grouped: Record<string, VariableFix[]> = {};

  for (const fix of fixes) {
    if (!grouped[fix.file]) {
      grouped[fix.file] = [];
    }
    grouped[fix.file].push(fix);
  }

  return grouped;
}

function printReport(fixes: VariableFix[]): void {
  const grouped = groupFixesByFile(fixes);
  const totalFixes = fixes.length;

  console.log('\n=== Unused Variable Analysis ===');
  console.log(`Total unused variables: ${totalFixes}`);
  console.log(`Files affected: ${Object.keys(grouped).length}`);

  const fixTypeCounts = {
    prefix_underscore: fixes.filter(f => f.fixType === 'prefix_underscore').length,
    eslint_disable: fixes.filter(f => f.fixType === 'eslint_disable').length,
    comment_out: fixes.filter(f => f.fixType === 'comment_out').length,
  };

  console.log('\nFix type breakdown:');
  console.log(`  Function parameters (prefix with _): ${fixTypeCounts.prefix_underscore}`);
  console.log(`  Local variables (eslint-disable): ${fixTypeCounts.eslint_disable}`);
  console.log(`  Unused imports (comment out): ${fixTypeCounts.comment_out}`);

  console.log('\n=== Variable Fixes ===');
  for (const [file, fileFixes] of Object.entries(grouped)) {
    console.log(`\n📁 ${file}:`);
    for (const fix of fileFixes) {
      const fixEmoji = fix.fixType === 'prefix_underscore' ? '🔧' :
                      fix.fixType === 'eslint_disable' ? '📝' : '❌';
      console.log(`  ${fixEmoji} ${fix.variableName} (${fix.fixType})`);

      if (fix.fixType === 'eslint_disable') {
        console.log(`     + // eslint-disable-next-line @typescript-eslint/no-unused-vars`);
        console.log(`     ${fix.fixedLine}`);
      } else {
        console.log(`     ${fix.originalLine} → ${fix.fixedLine}`);
      }
    }
  }
}

function restoreFromBackup(file: string): boolean {
  const filePath = path.resolve(process.cwd(), file);
  const backupPath = filePath + '.backup';

  if (!fs.existsSync(backupPath)) {
    console.error(`No backup found for ${file}`);
    return false;
  }

  try {
    fs.copyFileSync(backupPath, filePath);
    console.log(`Restored ${file} from backup`);
    return true;
  } catch (error) {
    console.error(`Failed to restore ${file} from backup:`, error);
    return false;
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const applyFlag = args.includes('--apply');
  const restoreFlag = args.includes('--restore');

  if (restoreFlag) {
    const fileArg = args.find(arg => arg.startsWith('--file='));
    if (fileArg) {
      const file = fileArg.split('=')[1];
      restoreFromBackup(file);
    } else {
      console.log('Usage: --restore --file=path/to/file.ts');
    }
    return;
  }

  console.log('🔍 Analyzing TypeScript unused variable errors...');

  const typeCheckOutput = runTypeCheck();
  const errors = parseUnusedVariableErrors(typeCheckOutput);

  if (errors.length === 0) {
    console.log('✅ No unused variable errors found!');
    return;
  }

  console.log(`Found ${errors.length} unused variable errors`);

  const fixes = generateVariableFixes(errors);

  printReport(fixes);

  if (applyFlag) {
    console.log('\n🔧 Applying unused variable fixes...');
    applyVariableFixes(fixes);
    console.log('\n✅ Unused variable fixes applied! Run `npm run type-check` to verify.');
  } else {
    console.log('\n💡 Run with --apply flag to apply these fixes');
    console.log('   Example: ts-node scripts/phase3-fix-unused-vars.ts --apply');
    console.log('\n🔄 To restore from backup: ts-node scripts/phase3-fix-unused-vars.ts --restore --file=path/to/file.ts');
  }
}

if (require.main === module) {
  main();
}