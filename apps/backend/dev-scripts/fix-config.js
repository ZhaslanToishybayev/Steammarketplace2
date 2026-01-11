#!/usr/bin/env node

const fs = require('fs');

function fixBullConfig() {
    const filePath = 'src/config/bull.config.ts';
    try {
        let content = fs.readFileSync(filePath, 'utf8');

        // Удаляем rateLimiter из конфигурации
        content = content.replace(
            /,\s*\/\/ Rate limiting for Steam API calls\s*rateLimiter: \{[^}]+\},\s*}/g,
            ''
        );

        content = content.replace(
            /,\s*\/\/ Rate limiting for inventory sync\s*rateLimiter: \{[^}]+\},\s*}/g,
            ''
        );

        // Удаляем все упоминания rateLimiter
        content = content.replace(
            /rateLimiter: \{[^}]+\},?\s*/g,
            ''
        );

        fs.writeFileSync(filePath, content);
        console.log('Fixed Bull queue configuration');
        return true;
    } catch (error) {
        console.error('Error fixing Bull config:', error.message);
        return false;
    }
}

function fixTypeORMConfig() {
    const filePath = 'src/config/database.config.ts';
    try {
        let content = fs.readFileSync(filePath, 'utf8');

        // Исправляем logger конфигурацию
        content = content.replace(
            /logger: configService\.get<string>\('NODE_ENV'\) === 'development' \? 'debug' : 'error',/g,
            "logger: configService.get<string>('NODE_ENV') === 'development' ? true : false,"
        );

        fs.writeFileSync(filePath, content);
        console.log('Fixed TypeORM database configuration');
        return true;
    } catch (error) {
        console.error('Error fixing TypeORM config:', error.message);
        return false;
    }
}

function fixRedisConfig() {
    const filePath = 'src/config/redis.config.ts';
    try {
        let content = fs.readFileSync(filePath, 'utf8');

        // Удаляем keyPrefix из конфигурации
        content = content.replace(
            /,\s*keyPrefix: configService\.get<string>\('REDIS_KEY_PREFIX', 'steam-marketplace:'\),/g,
            ''
        );

        fs.writeFileSync(filePath, content);
        console.log('Fixed Redis configuration');
        return true;
    } catch (error) {
        console.error('Error fixing Redis config:', error.message);
        return false;
    }
}

function fixWinstonImports() {
    const files = [
        'src/database/scripts/db-status.ts',
        'src/database/scripts/verify-db.ts',
        'src/database/seeds/run-seed.ts'
    ];

    for (const filePath of files) {
        try {
            let content = fs.readFileSync(filePath, 'utf8');

            // Исправляем Winston импорт
            content = content.replace(
                /import { LoggerService } from 'winston';/g,
                "import { Logger } from 'winston';"
            );

            fs.writeFileSync(filePath, content);
            console.log(`Fixed Winston import in: ${filePath}`);
        } catch (error) {
            console.error(`Error fixing ${filePath}:`, error.message);
        }
    }
}

function fixCommanderArgs() {
    const files = [
        'src/database/scripts/db-status.ts',
        'src/database/seeds/run-seed.ts'
    ];

    for (const filePath of files) {
        try {
            let content = fs.readFileSync(filePath, 'utf8');

            // Исправляем program.parse()
            content = content.replace(
                /program\.parse\(\);/g,
                'program.parse(process.argv);'
            );

            fs.writeFileSync(filePath, content);
            console.log(`Fixed Commander args in: ${filePath}`);
        } catch (error) {
            console.error(`Error fixing ${filePath}:`, error.message);
        }
    }
}

console.log('Fixing configuration errors...');
fixBullConfig();
fixTypeORMConfig();
fixRedisConfig();
fixWinstonImports();
fixCommanderArgs();
console.log('Configuration fixing completed!');