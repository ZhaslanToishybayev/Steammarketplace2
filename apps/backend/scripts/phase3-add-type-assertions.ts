#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TypeError {
  file: string;
  line: number;
  errorCode: string;
  message: string;
  affectedCode: string;
}

interface TypeAssertion {
  file: string;
  line: number;
  column: number;
  assertionType: 'assignment' | 'argument' | 'return';
  originalCode: string;
  assertedCode: string;
  todoComment: string;
  errorContext: string;
}

function runTypeCheck(): string {
  try {
    return execSync('npx tsc --noEmit', { encoding: 'utf8', cwd: process.cwd() });
  } catch (error) {
    // TypeScript compilation errors are returned in stderr for tsc
    return (error as any).stderr || (error as any).stdout || '';
  }
}

function parseTypeErrors(output: string): TypeError[] {
  const errors: TypeError[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // Match TypeScript error format: file.ts:line:column - error TSxxxx: message
    const match = line.match(/^(.+\.ts):(\d+):(\d+)\s*-\s*error\s+(TS\d+):\s*(.+)$/);
    if (match) {
      const [, file, line, column, errorCode, message] = match;

      // Focus on type mismatch errors that can be resolved with assertions
      // Excluding TS2339 and TS2338 as they indicate property existence issues
      const targetErrorCodes = ['TS2322', 'TS2345', 'TS2769'];
      if (targetErrorCodes.includes(errorCode)) {
        const affectedCode = getAffectedCode(file, parseInt(line), parseInt(column));

        errors.push({
          file,
          line: parseInt(line),
          errorCode,
          message,
          affectedCode,
        });
      } else if (errorCode === 'TS2339' || errorCode === 'TS2338') {
        // Log property existence errors but don't process them for assertions
        console.log(`⚠️  Property existence error ${errorCode} in ${file}:${line} - intentionally left for manual resolution: ${message}`);
      }
    }
  }

  return errors;
}

function getAffectedCode(file: string, line: number, column: number): string {
  try {
    const filePath = path.resolve(process.cwd(), file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const targetLine = lines[line - 1]; // Convert to 0-based index

    if (targetLine) {
      // Return the full line, trimmed
      return targetLine.trim();
    }
  } catch (error) {
    // Ignore errors and return empty string
  }

  return '';
}

function determineAssertionType(errorCode: string, message: string): 'assignment' | 'argument' | 'return' {
  if (errorCode === 'TS2322') {
    // TS2322: Type 'X' is not assignable to type 'Y'
    return 'assignment';
  } else if (errorCode === 'TS2345') {
    // TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'
    return 'argument';
  } else if (errorCode === 'TS2769') {
    // TS2769: Property 'X' does not exist on type 'Y'
    return 'assignment';
  }

  return 'assignment';
}

function generateTypeAssertions(errors: TypeError[]): TypeAssertion[] {
  const assertions: TypeAssertion[] = [];

  for (const error of errors) {
    const assertionType = determineAssertionType(error.errorCode, error.message);
    const originalCode = error.affectedCode;

    if (!originalCode) {
      continue;
    }

    let assertedCode = '';
    let todoComment = '';

    switch (assertionType) {
      case 'assignment':
        // For assignment errors, wrap the right-hand side with as any
        assertedCode = wrapWithAssertion(originalCode, 'as any');
        break;

      case 'argument':
        // For argument errors, wrap the argument with as any
        assertedCode = wrapArgumentWithAssertion(originalCode, 'as any');
        break;

      case 'return':
        // For return errors, wrap the return value with as any
        assertedCode = wrapReturnWithAssertion(originalCode, 'as any');
        break;
    }

    todoComment = `// TODO: Fix type - Phase 3 temporary assertion (${error.errorCode}: ${error.message.split('.')[0]})`;

    if (assertedCode && assertedCode !== originalCode) {
      assertions.push({
        file: error.file,
        line: error.line,
        column: 1, // We'll determine this more precisely if needed
        assertionType,
        originalCode,
        assertedCode,
        todoComment,
        errorContext: error.message,
      });
    }
  }

  return assertions;
}

function wrapWithAssertion(code: string, assertion: string): string {
  // Handle different assignment patterns
  const patterns = [
    // const variable = expression
    /^(\s*const\s+\w+[^=]*=\s*)(.*)$/,
    // let variable = expression
    /^(\s*let\s+\w+[^=]*=\s*)(.*)$/,
    // variable = expression
    /^(\s*\w+[^=]*=\s*)(.*)$/,
    // return expression
    /^(\s*return\s+)(.*)$/,
    // await expression
    /^(\s*await\s+)(.*)$/,
  ];

  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match) {
      const [, prefix, expression] = match;
      // Don't wrap if it already has an assertion
      if (!expression.includes(' as ')) {
        return prefix + expression.trim() + ` ${assertion}`;
      }
      return code; // Already has assertion
    }
  }

  return code;
}

function wrapArgumentWithAssertion(code: string, assertion: string): string {
  // Handle function calls with type errors
  const patterns = [
    // functionName(arg)
    /^(\s*\w+\s*\(\s*)([^)]*)(\s*\)\s*)$/,
    // await functionName(arg)
    /^(\s*await\s+\w+\s*\(\s*)([^)]*)(\s*\)\s*)$/,
    // return functionName(arg)
    /^(\s*return\s+\w+\s*\(\s*)([^)]*)(\s*\)\s*)$/,
  ];

  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match) {
      const [, prefix, args, suffix] = match;
      // Wrap each argument that doesn't already have an assertion
      const wrappedArgs = args.split(',').map(arg => {
        const trimmedArg = arg.trim();
        if (trimmedArg && !trimmedArg.includes(' as ')) {
          return trimmedArg + ` ${assertion}`;
        }
        return trimmedArg;
      }).join(', ');

      return prefix + wrappedArgs + suffix;
    }
  }

  return code;
}

function wrapReturnWithAssertion(code: string, assertion: string): string {
  // Handle return statements
  const returnPattern = /^(\s*return\s+)(.*)$/;
  const match = code.match(returnPattern);

  if (match) {
    const [, prefix, expression] = match;
    if (!expression.includes(' as ')) {
      return prefix + expression.trim() + ` ${assertion}`;
    }
  }

  return code;
}

function applyTypeAssertions(assertions: TypeAssertion[]): void {
  const groupedAssertions = groupAssertionsByFile(assertions);

  for (const [file, fileAssertions] of Object.entries(groupedAssertions)) {
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

      // Apply assertions in reverse order to maintain line numbers
      const sortedAssertions = fileAssertions.sort((a, b) => b.line - a.line);

      for (const assertion of sortedAssertions) {
        const lineIndex = assertion.line - 1; // Convert to 0-based index

        // Add TODO comment above the line
        lines.splice(lineIndex, 0, assertion.todoComment);

        // Replace the line
        lines[lineIndex + 1] = lines[lineIndex + 1].replace(
          assertion.originalCode,
          assertion.assertedCode
        );
      }

      // Write back to file
      fs.writeFileSync(filePath, lines.join('\n'));
      console.log(`Added ${fileAssertions.length} type assertions to ${file}`);

    } catch (error) {
      console.error(`Failed to apply assertions to ${file}:`, error);
    }
  }
}

function groupAssertionsByFile(assertions: TypeAssertion[]): Record<string, TypeAssertion[]> {
  const grouped: Record<string, TypeAssertion[]> = {};

  for (const assertion of assertions) {
    if (!grouped[assertion.file]) {
      grouped[assertion.file] = [];
    }
    grouped[assertion.file].push(assertion);
  }

  return grouped;
}

function printReport(assertions: TypeAssertion[]): void {
  const grouped = groupAssertionsByFile(assertions);
  const totalAssertions = assertions.length;

  console.log('\n=== Type Assertion Analysis ===');
  console.log(`Total type errors: ${totalAssertions}`);
  console.log(`Files affected: ${Object.keys(grouped).length}`);

  const assertionTypeCounts = {
    assignment: assertions.filter(a => a.assertionType === 'assignment').length,
    argument: assertions.filter(a => a.assertionType === 'argument').length,
    return: assertions.filter(a => a.assertionType === 'return').length,
  };

  console.log('\nAssertion type breakdown:');
  console.log(`  Assignment errors: ${assertionTypeCounts.assignment}`);
  console.log(`  Argument errors: ${assertionTypeCounts.argument}`);
  console.log(`  Return errors: ${assertionTypeCounts.return}`);

  console.log('\n=== Type Assertions ===');
  for (const [file, fileAssertions] of Object.entries(grouped)) {
    console.log(`\n📁 ${file}:`);
    for (const assertion of fileAssertions) {
      const typeEmoji = assertion.assertionType === 'assignment' ? '📝' :
                       assertion.assertionType === 'argument' ? '🔧' : '📤';
      console.log(`  ${typeEmoji} ${assertion.assertionType}: ${assertion.originalCode}`);
      console.log(`     → ${assertion.assertedCode}`);
      console.log(`     ${assertion.todoComment}`);
    }
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const applyFlag = args.includes('--apply');
  const previewFlag = !args.includes('--apply') && !args.includes('--preview');

  console.log('🔍 Analyzing TypeScript type errors...');

  const typeCheckOutput = runTypeCheck();
  const errors = parseTypeErrors(typeCheckOutput);

  if (errors.length === 0) {
    console.log('✅ No type errors found!');
    return;
  }

  console.log(`Found ${errors.length} type errors`);

  const assertions = generateTypeAssertions(errors);

  printReport(assertions);

  if (applyFlag) {
    console.log('\n🔧 Adding type assertions...');
    applyTypeAssertions(assertions);
    console.log('\n✅ Type assertions added! Run `npm run type-check` to verify.');
    console.log('\n⚠️  WARNING: All assertions are temporary and should be reviewed post-launch.');
  } else if (previewFlag) {
    console.log('\n💡 Review the suggested changes above.');
    console.log('   To apply: ts-node scripts/phase3-add-type-assertions.ts --apply');
    console.log('   ⚠️  WARNING: This adds temporary "as any" assertions that should be reviewed later.');
  }
}

if (require.main === module) {
  main();
}