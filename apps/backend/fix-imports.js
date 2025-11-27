#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Функция для исправления импортов в файле
function fixImports(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');

        // Заменяем .ts расширения на .js в импортах
        content = content.replace(
            /from\s+['"]([^'"]+\.entity)\.ts['"]/g,
            "from '$1.js'"
        );

        content = content.replace(
            /import\s+[^'"]*\s+from\s+['"]([^'"]+\.entity)\.ts['"]/g,
            "import $1 from '$1.js'"
        );

        // Также исправляем другие возможные импорты
        content = content.replace(
            /from\s+['"]([^'"]+)\.ts['"]/g,
            (match, p1) => {
                // Не менять если это уже .js или это не TypeScript файл
                if (p1.endsWith('.js') || !p1.includes('/')) return match;
                return `from '${p1}.js'`;
            }
        );

        // Более агрессивная замена для всех импортов с .ts
        content = content.replace(
            /from\s+['"]([^'"]+)\.entity['"]/g,
            "from '$1.entity.js'"
        );

        fs.writeFileSync(filePath, content);
        console.log(`Fixed imports in: ${filePath}`);
        return true;
    } catch (error) {
        console.error(`Error fixing ${filePath}:`, error.message);
        return false;
    }
}

// Рекурсивно обходим все TypeScript файлы
function processDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            processDirectory(fullPath);
        } else if (file.endsWith('.ts') && !file.endsWith('.spec.ts')) {
            fixImports(fullPath);
        }
    }
}

// Запускаем обработку
console.log('Fixing TypeScript imports...');
processDirectory('src');
console.log('Import fixing completed!');