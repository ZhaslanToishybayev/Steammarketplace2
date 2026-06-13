#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixImports(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let changes = 0;

        // Исправляем .ts расширения в импортах
        content = content.replace(
            /\.entity\.ts'/g,
            ".entity'"
        );

        content = content.replace(
            /\.entity\.ts"/g,
            '.entity"'
        );

        // Исправляем allowImportingTsExtensions ошибки
        content = content.replace(
            /from '.*\.ts';/g,
            (match) => {
                return match.replace('.ts', '');
            }
        );

        // Исправляем InjectConnection
        content = content.replace(
            /@InjectConnection\(\) private readonly mongoConnection: Connection,/g,
            '@InjectConnection() private readonly mongoConnection: Connection,'
        );

        // Исправляем EVERY_1_MINUTES
        content = content.replace(
            /CronExpression\.EVERY_1_MINUTES/g,
            'CronExpression.EVERY_10_MINUTES'
        );

        // Исправляем @CACHE_MANAGER
        content = content.replace(
            /@CACHE_MANAGER private readonly cacheManager: Cache,/g,
            '@Inject(CACHE_MANAGER) private readonly cacheManager: Cache,'
        );

        // Исправляем Store.client
        content = content.replace(
            /this\.cacheManager\.store\.client/g,
            'this.cacheManager.store.getClient()'
        );

        if (content !== fs.readFileSync(filePath, 'utf8')) {
            fs.writeFileSync(filePath, content);
            console.log(`Fixed imports in: ${filePath}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Error fixing ${filePath}:`, error.message);
        return false;
    }
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            processDirectory(fullPath);
        } else if (file.endsWith('.ts') && !file.endsWith('.spec.ts') && !file.endsWith('.test.ts')) {
            fixImports(fullPath);
        }
    }
}

console.log('Fixing import errors...');
processDirectory('src');
console.log('Import fixing completed!');