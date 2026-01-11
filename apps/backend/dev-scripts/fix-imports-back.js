#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Функция для исправления импортов в файле
function fixImports(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');

        // Заменяем длинные пути на короткие алиасы
        content = content.replace(
            /import\s+{([^}]+)}\s+from\s+['"]\.\.\/\.\.\/\.\.\/modules\/auth\/entities\/user\.entity\.js['"]/g,
            "import { User } from '@entities/user.entity'"
        );

        content = content.replace(
            /import\s+{([^}]+)}\s+from\s+['"]\.\.\/\.\.\/\.\.\/modules\/inventory\/entities\/inventory\.entity\.js['"]/g,
            "import { Inventory } from '@entities/inventory.entity'"
        );

        content = content.replace(
            /import\s+{([^}]+)}\s+from\s+['"]\.\.\/\.\.\/\.\.\/modules\/trading\/entities\/trade\.entity\.js['"]/g,
            "import { Trade } from '@entities/trade.entity'"
        );

        content = content.replace(
            /import\s+{([^}]+)}\s+from\s+['"]\.\.\/\.\.\/\.\.\/modules\/pricing\/entities\/item-price\.entity\.js['"]/g,
            "import { ItemPrice } from '@entities/item-price.entity'"
        );

        // Возвращаем оригинальные .ts расширения
        content = content.replace(
            /from\s+['"]([^'"]+)\.entity\.js['"]/g,
            "from '$1.entity.ts'"
        );

        // Также исправляем другие .js на .ts
        content = content.replace(
            /from\s+['"]([^'"]+)\.ts\.js['"]/g,
            "from '$1.ts'"
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