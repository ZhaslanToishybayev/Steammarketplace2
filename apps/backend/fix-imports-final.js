#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Функция для исправления импортов в файле
function fixImports(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');

        // Возвращаем оригинальные .ts расширения для entity файлов
        content = content.replace(
            /from\s+['"]([^'"]+)\.entity\.js['"]/g,
            "from '$1.entity.ts'"
        );

        // Также исправляем другие .js на .ts
        content = content.replace(
            /from\s+['"]([^'"]+)\.ts\.js['"]/g,
            "from '$1.ts'"
        );

        // Возвращаем оригинальные пути для алиасов
        content = content.replace(
            /import\s+{([^}]+)}\s+from\s+['"]@entities\/user\.entity['"]/g,
            "import { User } from '../../../modules/auth/entities/user.entity'"
        );

        content = content.replace(
            /import\s+{([^}]+)}\s+from\s+['"]@entities\/inventory\.entity['"]/g,
            "import { Inventory } from '../../../modules/inventory/entities/inventory.entity'"
        );

        content = content.replace(
            /import\s+{([^}]+)}\s+from\s+['"]@entities\/trade\.entity['"]/g,
            "import { Trade } from '../../../modules/trading/entities/trade.entity'"
        );

        content = content.replace(
            /import\s+{([^}]+)}\s+from\s+['"]@entities\/item-price\.entity['"]/g,
            "import { ItemPrice } from '../../../modules/pricing/entities/item-price.entity'"
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