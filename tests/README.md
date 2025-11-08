# Tests Documentation

## Структура тестов

```
tests/
├── setup.js                 # Jest setup configuration
├── README.md               # This file
├── unit/                   # Unit tests
│   ├── models/            # Model tests
│   │   └── User.test.js
│   ├── services/          # Service tests
│   │   ├── SteamBot.test.js
│   │   └── SteamBotManager.test.js
│   ├── routes/            # Route tests
│   │   ├── auth.test.js
│   │   └── marketplace.test.js
│   └── middleware/        # Middleware tests
│       └── auth.test.js
├── integration/           # Integration tests
│   └── README.md
└── mocks/                 # Mock data and utilities
    └── database.js
```

## Запуск тестов

### Все тесты
```bash
npm test
```

### Только unit тесты
```bash
npm run test:unit
```

### Только integration тесты
```bash
npm run test:integration
```

### Покрытие кода
```bash
npm test -- --coverage
```

### В режиме watch
```bash
npm run test:watch
```

## Покрытие кода

Отчет о покрытии создается в папке `coverage/`. Откройте `coverage/lcov-report/index.html` в браузере для просмотра детального отчета.

## Mocking

- **MongoDB**: Используется мок вместо реальной базы данных
- **Steam APIs**: Мокируются для изоляции тестов
- **Logger**: Перенаправляет вывод для чистоты тестов

## Покрытие компонентов

### Модели
- ✅ User model
- ⏳ MarketListing model
- ⏳ Transaction model

### Сервисы
- ✅ SteamBot
- ✅ SteamBotManager
- ⏳ steamIntegrationService
- ⏳ tradeOfferService

### Маршруты
- ✅ Auth routes
- ✅ Marketplace routes
- ⏳ Steam routes
- ⏳ Admin routes

### Middleware
- ✅ Auth middleware
- ⏳ Validation middleware
- ⏳ Error handler

## Best Practices

1. **Изоляция тестов**: Каждый тест независим
2. **Mocking**: Внешние зависимости мокируются
3. **Clear naming**: Тесты и ассерты имеют понятные названия
4. **Coverage**: Цель - 80%+ покрытие
5. **Fast tests**: Unit тесты должны выполняться быстро
