#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixRxJSTypes(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let changes = 0;

        // Исправляем Observable типы в интерсепторах
        content = content.replace(
            /intercept\(context: ExecutionContext, next: CallHandler\): Observable<StandardApiResponse<T> \| T>/g,
            'intercept(context: ExecutionContext, next: CallHandler): Observable<StandardApiResponse<T>> | Promise<Observable<StandardApiResponse<T>>>'
        );
        if (content.includes('Observable<StandardApiResponse<T>> | Promise<Observable<StandardApiResponse<T>>>')) {
            changes++;
        }

        // Исправляем Promise<Observable<any>> на Observable<any>
        content = content.replace(
            /Promise<Observable<([^>]+)>>/g,
            'Observable<$1>'
        );

        // Исправляем Observable<any> на Observable<unknown>
        content = content.replace(
            /Observable<any>/g,
            'Observable<unknown>'
        );

        // Исправляем типы в throttle guard
        content = content.replace(
            /throw new ThrottlerException\(\[[^)]+\]\)/g,
            (match) => {
                // Извлекаем сообщение из массива
                const messageMatch = match.match(/`Too many requests, please try again in \$\{([^}]+)\} seconds\./);
                if (messageMatch) {
                    return `throw new ThrottlerException(\`Too many requests, please try again in \${${messageMatch[1]}} seconds.\`)`;
                }
                return match;
            }
        );

        // Исправляем includes для чисел
        content = content.replace(
            /contentType && !contentType\.includes\('application\/json'\)/g,
            'contentType && typeof contentType === "string" && !contentType.includes("application/json")'
        );

        if (changes > 0 || content.includes('Observable<') || content.includes('ThrottlerException')) {
            fs.writeFileSync(filePath, content);
            console.log(`Fixed RxJS types in: ${filePath}`);
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
            fixRxJSTypes(fullPath);
        }
    }
}

console.log('Fixing RxJS types...');
processDirectory('src');
console.log('RxJS type fixing completed!');