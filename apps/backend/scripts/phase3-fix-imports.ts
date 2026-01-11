#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface ImportError {
  file: string;
  line: number;
  missingModule: string;
  errorCode: string;
  message: string;
  errorType: 'missing_symbol' | 'missing_module'; // TS2304 = missing_symbol, TS2307 = missing_module
}

interface ImportSuggestion {
  file: string;
  missingName: string;
  suggestedImport: string;
  confidence: 'high' | 'medium' | 'low';
  exportLocation: string;
}

function runTypeCheck(): string {
  try {
    return execSync('npx tsc --noEmit', { encoding: 'utf8', cwd: process.cwd() });
  } catch (error) {
    // TypeScript compilation errors are returned in stderr for tsc
    return (error as any).stderr || (error as any).stdout || '';
  }
}

function parseImportErrors(output: string): ImportError[] {
  const errors: ImportError[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // Match TypeScript error format: file.ts:line:column - error TSxxxx: message
    const match = line.match(/^(.+\.ts):(\d+):\d+\s*-\s*error\s+(TS\d+):\s*(.+)$/);
    if (match) {
      const [, file, line, errorCode, message] = match;
      if (errorCode === 'TS2307' || errorCode === 'TS2304') {
        let missingModule = '';
        let errorType: 'missing_symbol' | 'missing_module';

        if (errorCode === 'TS2307') {
          // TS2307: Cannot find module 'module-name'
          const moduleMatch = message.match(/Cannot find module '(.+)'|'(.+)'$/);
          missingModule = (moduleMatch?.[1] || moduleMatch?.[2] || '').replace(/['"]/g, '');
          errorType = 'missing_module';
        } else if (errorCode === 'TS2304') {
          // TS2304: Cannot find name 'VariableName'
          const nameMatch = message.match(/Cannot find name '(.+)'$/);
          missingModule = nameMatch?.[1] || '';
          errorType = 'missing_symbol';
        } else {
          // Fallback case (shouldn't happen but TypeScript needs it)
          missingModule = '';
          errorType = 'missing_symbol';
        }

        if (missingModule) {
          errors.push({
            file,
            line: parseInt(line),
            missingModule,
            errorCode,
            message,
            errorType,
          });
        }
      }
    }
  }

  return errors;
}

function findExportMatches(missingName: string, currentFile: string): Array<{ exportPath: string; exportName: string; isDefault: boolean }> {
  const matches: Array<{ exportPath: string; exportName: string; isDefault: boolean }> = [];
  const backendSrc = path.join(process.cwd(), 'src');

  try {
    // Search for exports in the codebase
    const grepCommand = `grep -r "export.*${missingName}" ${backendSrc} --include="*.ts"`;
    const grepOutput = execSync(grepCommand, { encoding: 'utf8', cwd: process.cwd() });

    const lines = grepOutput.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        const [filePath, exportLine] = line.split(':');
        if (filePath && exportLine) {
          const exportPath = path.relative(process.cwd(), filePath);

          // Determine if it's a default export or named export
          const isDefault = exportLine.includes('export default');
          const isNamed = exportLine.includes(`export {`) && exportLine.includes(missingName);

          if (isDefault || isNamed) {
            const relativePath = getRelativeImportPath(currentFile, exportPath);
            matches.push({
              exportPath: relativePath,
              exportName: missingName,
              isDefault,
            });
          }
        }
      }
    }
  } catch (error) {
    // grep might return exit code 1 if no matches found, which is expected
  }

  return matches;
}

function getRelativeImportPath(fromFile: string, toFile: string): string {
  // Resolve both paths to absolute paths
  const fromPath = path.resolve(process.cwd(), fromFile);
  const toPath = path.resolve(process.cwd(), toFile.replace('.ts', ''));

  const fromDir = path.dirname(fromPath);
  const relativePath = path.relative(fromDir, toPath);

  // Ensure relative path starts with ./ or ../
  let importPath = relativePath;
  if (!relativePath.startsWith('./') && !relativePath.startsWith('../')) {
    importPath = './' + relativePath;
  }

  return importPath;
}

function generateImportSuggestions(errors: ImportError[]): ImportSuggestion[] {
  const suggestions: ImportSuggestion[] = [];

  for (const error of errors) {
    const matches = findExportMatches(error.missingModule, error.file);

    if (matches.length === 1) {
      // High confidence: exactly one match
      const match = matches[0];
      const importStatement = match.isDefault
        ? `import ${match.exportName} from '${match.exportPath}';`
        : `import { ${match.exportName} } from '${match.exportPath}';`;

      suggestions.push({
        file: error.file,
        missingName: error.missingModule,
        suggestedImport: importStatement,
        confidence: 'high',
        exportLocation: match.exportPath,
      });
    } else if (matches.length > 1) {
      // Medium confidence: multiple matches, suggest the first one
      const match = matches[0];
      const importStatement = match.isDefault
        ? `import ${match.exportName} from '${match.exportPath}';`
        : `import { ${match.exportName} } from '${match.exportPath}';`;

      suggestions.push({
        file: error.file,
        missingName: error.missingModule,
        suggestedImport: importStatement,
        confidence: 'medium',
        exportLocation: match.exportPath,
      });
    } else {
      // Only create low-confidence suggestions for missing symbols, not missing modules
      // Log that manual intervention is required for missing modules (TS2307)
      if (error.errorType === 'missing_module') {
        console.log(`⚠️  TS2307 error for module '${error.missingModule}' in ${error.file}: Manual import required`);
      } else {
        // Low confidence: no matches found for symbol, suggest external module
        suggestions.push({
          file: error.file,
          missingName: error.missingModule,
          suggestedImport: `import { ${error.missingModule} } from '${error.missingModule}';`,
          confidence: 'low',
          exportLocation: 'external',
        });
      }
    }
  }

  return suggestions;
}

function groupSuggestionsByFile(suggestions: ImportSuggestion[]): Record<string, ImportSuggestion[]> {
  const grouped: Record<string, ImportSuggestion[]> = {};

  for (const suggestion of suggestions) {
    if (!grouped[suggestion.file]) {
      grouped[suggestion.file] = [];
    }
    grouped[suggestion.file].push(suggestion);
  }

  return grouped;
}

function applyImportFixes(suggestions: ImportSuggestion[]): void {
  const grouped = groupSuggestionsByFile(suggestions);

  for (const [file, fileSuggestions] of Object.entries(grouped)) {
    const filePath = path.resolve(process.cwd(), file);
    const backupPath = filePath + '.backup';

    try {
      // Create backup
      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, backupPath);
        console.log(`Created backup: ${backupPath}`);
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      // Find the last import statement
      let lastImportIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          lastImportIndex = i;
        }
      }

      if (lastImportIndex === -1) {
        throw new Error('No import statements found in file');
      }

      // Only auto-insert high-confidence suggestions
      const highConfidenceImports = fileSuggestions.filter(s => s.confidence === 'high');
      const mediumConfidenceImports = fileSuggestions.filter(s => s.confidence === 'medium');
      const lowConfidenceImports = fileSuggestions.filter(s => s.confidence === 'low');

      console.log(`\n📁 ${file}:`);
      console.log(`  Auto-applying ${highConfidenceImports.length} high-confidence imports`);
      if (mediumConfidenceImports.length > 0) {
        console.log(`  Preview-only ${mediumConfidenceImports.length} medium-confidence imports (not auto-applied)`);
      }
      if (lowConfidenceImports.length > 0) {
        console.log(`  Preview-only ${lowConfidenceImports.length} low-confidence imports (not auto-applied)`);
      }

      const importsToadd = highConfidenceImports.map(s => s.suggestedImport);

      // Insert imports after the last existing import
      lines.splice(lastImportIndex + 1, 0, ...importsToadd);

      // Write back to file
      fs.writeFileSync(filePath, lines.join('\n'));
      console.log(`Applied ${highConfidenceImports.length} import fixes to ${file}`);

    } catch (error) {
      console.error(`Failed to apply fixes to ${file}:`, error);
    }
  }
}

function printReport(suggestions: ImportSuggestion[]): void {
  const grouped = groupSuggestionsByFile(suggestions);
  const totalErrors = suggestions.length;

  console.log('\n=== Import Error Analysis ===');
  console.log(`Total missing imports: ${totalErrors}`);
  console.log(`Files affected: ${Object.keys(grouped).length}`);

  const confidenceCounts = {
    high: suggestions.filter(s => s.confidence === 'high').length,
    medium: suggestions.filter(s => s.confidence === 'medium').length,
    low: suggestions.filter(s => s.confidence === 'low').length,
  };

  console.log('\nConfidence breakdown:');
  console.log(`  High confidence: ${confidenceCounts.high} imports`);
  console.log(`  Medium confidence: ${confidenceCounts.medium} imports`);
  console.log(`  Low confidence: ${confidenceCounts.low} imports`);

  console.log('\n=== Suggested Fixes ===');
  for (const [file, fileSuggestions] of Object.entries(grouped)) {
    console.log(`\n📁 ${file}:`);
    for (const suggestion of fileSuggestions) {
      const confidenceEmoji = suggestion.confidence === 'high' ? '✅' :
                             suggestion.confidence === 'medium' ? '⚠️' : '❌';
      console.log(`  ${confidenceEmoji} ${suggestion.suggestedImport} (${suggestion.confidence})`);
    }
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const applyFlag = args.includes('--apply');

  console.log('🔍 Analyzing TypeScript import errors...');

  const typeCheckOutput = runTypeCheck();
  const errors = parseImportErrors(typeCheckOutput);

  if (errors.length === 0) {
    console.log('✅ No import errors found!');
    return;
  }

  console.log(`Found ${errors.length} import errors`);

  const suggestions = generateImportSuggestions(errors);

  printReport(suggestions);

  if (applyFlag) {
    console.log('\n🔧 Applying import fixes...');
    applyImportFixes(suggestions);
    console.log('\n✅ Import fixes applied! Run `npm run type-check` to verify.');
  } else {
    console.log('\n💡 Run with --apply flag to apply these fixes');
    console.log('   Example: ts-node scripts/phase3-fix-imports.ts --apply');
  }
}

if (require.main === module) {
  main();
}