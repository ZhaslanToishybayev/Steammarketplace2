# 🛠️ Claude Code Assistant Tools

Эти инструменты реально работают в Claude Code и помогают избегать багов и галлюцинаций.

## 🚀 Основные команды для Claude Code

### 1. Strict Code Validation
```bash
# Запускать после каждого изменения кода
npm run lint:strict      # ESLint со строгими правилами
npm run type-check       # TypeScript проверка без компиляции
npm run test:unit        # Unit тесты для проверки логики
```

### 2. Code Quality Gates
```bash
# Обязательные проверки перед коммитом
npm run quality:gate     # Полная проверка качества
npm run security:check   # Проверка безопасности
npm run coverage:check   # Проверка покрытия тестами
```

### 3. Steam Integration Validation
```bash
# Проверка Steam API интegration
npm run steam:validate   # Валидация Steam интеграции
npm run steam:health     # Проверка здоровья Steam сервисов
```

## 📋 Claude Code Workflow

### Шаг 1: Анализ проблемы
```bash
# 1. Проверить текущее состояние
npm run health:check
npm run type-check

# 2. Запустить релевантные тесты
npm run test:steam
npm run test:auth
```

### Шаг 2: Разработка решения
```bash
# 1. Включить watch-режим для быстрой проверки
npm run type-check:watch

# 2. Писать код с немедленной проверкой
npm run lint:fix        # Автоматическое исправление
npm run test:watch      # Запуск тестов при изменениях
```

### Шаг 3: Валидация решения
```bash
# 1. Полная проверка
npm run quality:gate

# 2. Специфические проверки
npm run test:integration
npm run test:e2e

# 3. Производительность
npm run performance:check
```

## 🔍 Claude Code Debug Commands

### Memory & Performance
```bash
npm run memory:check     # Проверка утечек памяти
npm run performance:audit # Performance аудит
npm run bundle:analyze   # Анализ размера бандла
```

### Error Detection
```bash
npm run error:scan       # Сканирование ошибок
npm run dependency:check # Проверка зависимостей
npm run security:scan    # Сканирование уязвимостей
```

## 🎮 Steam-Specific Claude Tools

### Steam API Validation
```bash
npm run steam:api:test   # Тестирование Steam API
npm run steam:auth:test  # Тестирование Steam OAuth
npm run steam:inventory:test # Тестирование инвентаря
```

### Bot Health Monitoring
```bash
npm run bot:health       # Проверка здоровья ботов
npm run bot:trade:test   # Тестирование торговых операций
npm run bot:auth:test    # Тестирование аутентификации ботов
```

## 📊 Quality Metrics for Claude

### Code Quality Score
```bash
# Запускать для оценки качества кода
npm run quality:score    # Оценка качества (0-100)
npm run complexity:check # Проверка сложности кода
npm run duplication:check # Проверка дублирования
```

### Test Coverage
```bash
npm run coverage:report  # Отчет о покрытии тестами
npm run coverage:steam   # Покрытие Steam-модулей
npm run coverage:auth    # Покрытие auth-модулей
```

## 🚨 Claude Code Error Prevention

### Pre-commit Validation
```bash
# Обязательные проверки перед сохранением
npm run pre-commit:all   # Все проверки
npm run pre-commit:fast  # Быстрые проверки (lint + type-check)
```

### Real-time Monitoring
```bash
npm run monitor:dev      # Мониторинг в реальном времени
npm run log:errors       # Логирование ошибок
npm run alert:critical   # Критические оповещения
```

## 🎯 Best Practices for Claude

### 1. Always Validate Assumptions
```bash
# Перед реализацией - проверить существующий код
npm run type-check
npm run test:existing

# После реализации - полная валидация
npm run quality:gate
npm run test:new
```

### 2. Incremental Development
```bash
# Маленькими шагами с постоянной проверкой
npm run lint:fix        # После каждого изменения
npm run type-check      # Проверка типов
npm run test:unit       # Unit тесты
```

### 3. Steam Integration Safety
```bash
# Всегда проверять Steam интеграцию
npm run steam:validate  # Валидация перед коммитом
npm run steam:health    # Проверка после изменений
```

## 📈 Performance Guidelines

### Bundle Size Control
```bash
npm run bundle:size      # Проверка размера бандла
npm run chunk:analyze    # Анализ чанков
npm run tree:shake       # Tree shaking проверка
```

### Runtime Performance
```bash
npm run runtime:check    # Проверка производительности
npm run memory:usage     # Проверка использования памяти
npm run cpu:profile      # CPU профилирование
```

## 🔒 Security Guidelines

### Code Security
```bash
npm run security:audit   # Полная проверка безопасности
npm run vuln:check       # Проверка уязвимостей
npm run secret:scan      # Скан Secret'ов
```

### Steam API Security
```bash
npm run steam:security   # Безопасность Steam API
npm run jwt:validate     # Валидация JWT
npm run rate:limit       # Проверка рейт-лимитов
```

---

**💡 Использование:**
1. Всегда запускать `npm run quality:gate` перед коммитом
2. Использовать `npm run type-check:watch` при разработке
3. Проверять Steam интеграцию командами `npm run steam:*`
4. Контролировать качество с помощью `npm run quality:score`