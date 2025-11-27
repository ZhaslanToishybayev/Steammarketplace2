# 🤖 Claude Code Workflow Guide

## 🎯 **Как я использую эти инструменты в Claude Code**

### **1. Перед началом работы**
```bash
# Проверить текущее состояние
npm run quality:gate          # Полная проверка качества
npm run steam:validate        # Проверка Steam интegration
npm run type-check            # TypeScript проверка
```

### **2. При разработке кода**

**🔍 Анализ проблемы:**
```bash
# 1. Найти релевантные файлы
find apps/backend/src -name "*.ts" | grep -E "(auth|steam|trading)"

# 2. Проверить существующие тесты
npm run test:auth --testNamePattern="existing functionality"

# 3. Запустить type-check для понимания типов
npm run type-check
```

**📝 Написание кода:**
```bash
# 1. Включить строгий режим разработки
npm run type-check:watch &     # Проверка типов в реальном времени
npm run lint:strict &          # Строгая проверка кода

# 2. Писать код с немедленной проверкой
# (каждое изменение сразу проверяется)
```

**✅ Валидация изменений:**
```bash
# 1. Быстрая проверка
npm run pre-commit:fast         # Линтер + TypeScript

# 2. Полная проверка
npm run quality:gate           # Все проверки

# 3. Тестирование
npm run test:unit              # Unit тесты
npm run test:integration       # Integration тесты
```

### **3. Для предотвращения галлюцинаций**

**📚 Всегда проверять существующий код:**
```bash
# 1. Изучить структуру модулей
ls -la apps/backend/src/modules/

# 2. Проверить существующие интерфейсы
grep -r "interface.*Steam" apps/backend/src/

# 3. Изучить существующие DTO
find apps/backend/src -name "*.dto.ts" | head -5
```

**🔍 Проверка типов:**
```bash
# Всегда использовать строгую типизацию
npm run type-check

# Проверить конкретный файл
npx tsc --noEmit apps/backend/src/modules/auth/auth.service.ts
```

**🧪 Тестирование гипотез:**
```bash
# Запустить тесты для проверки предположений
npm run test:auth
npm run test:steam

# Проверить конкретную функциональность
npm run test:steam --testNamePattern="inventory sync"
```

### **4. Для уменьшения багов**

**🛡️ Строгие правила:**
```bash
# 1. Строгий линтер
npm run lint:strict            # Ноль предупреждений

# 2. Строгая типизация
npm run type-check             # Все типы должны быть явными

# 3. Покрытие тестами
npm run coverage:check         # Минимум 80% покрытия
```

**🔍 Пошаговая проверка:**
```bash
# 1. Проверка кода
npm run lint:strict

# 2. Проверка типов
npm run type-check

# 3. Unit тесты
npm run test:unit

# 4. Integration тесты
npm run test:integration

# 5. Security проверка
npm run security:check
```

### **5. Steam-Specific Validation**

**🎮 Steam API проверки:**
```bash
# 1. Проверка Steam API интеграции
npm run steam:validate

# 2. Проверка аутентификации
npm run steam:auth:test

# 3. Проверка инвентаря
npm run steam:inventory:test

# 4. Проверка ботов
npm run bot:health
npm run bot:trade:test
```

### **6. Performance & Memory Checks**

**⚡ Производительность:**
```bash
# 1. Bundle анализ
npm run bundle:analyze

# 2. Performance аудит
npm run lighthouse

# 3. Memory проверка
npm run memory:usage
```

### **7. Security Validation**

**🔒 Безопасность:**
```bash
# 1. Security аудит
npm run security:audit

# 2. Проверка уязвимостей
npm run vuln:check

# 3. Скан secret'ов
npm run secret:scan
```

## 🚨 **Критические правила для Claude Code**

### **1. Никогда не гадать:**
- Всегда проверять существующие файлы
- Всегда использовать `npm run type-check`
- Всегда запускать релевантные тесты

### **2. Пошаговая валидация:**
```bash
# Каждое изменение проверять:
npm run lint:strict    → npm run type-check → npm run test:unit
```

### **3. Steam Integration:**
- Всегда использовать `npm run steam:validate`
- Проверять существующие Steam API вызовы
- Тестировать с реальными Steam API (если доступно)

### **4. Quality Gates:**
- `npm run quality:gate` перед каждым коммитом
- `npm run coverage:check` для проверки покрытия
- `npm run security:check` для безопасности

## 📋 **Чек-лист для Claude Code**

### **Перед изменением кода:**
- [ ] Проверил существующую структуру
- [ ] Запустил `npm run type-check`
- [ ] Запустил релевантные тесты
- [ ] Проверил Steam API интеграцию

### **После изменения кода:**
- [ ] `npm run lint:strict` - проходит
- [ ] `npm run type-check` - проходит
- [ ] `npm run test:unit` - проходит
- [ ] `npm run quality:gate` - проходит

### **Перед коммитом:**
- [ ] `npm run quality:gate` - все проверки пройдены
- [ ] `npm run coverage:check` - покрытие >= 80%
- [ ] `npm run steam:validate` - Steam интеграция работает
- [ ] `npm run security:check` - нет уязвимостей

---

**💡 Эти инструменты реально работают в Claude Code и помогают избегать багов и галлюцинаций!**