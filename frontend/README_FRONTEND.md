# 🎨 Frontend - Steam Marketplace

## 🚀 Запуск

```bash
cd frontend
npm install
npm run dev
```

Frontend запустится на http://localhost:5174/

## 📦 Установленные зависимости

- **React 18** - UI library
- **Vite** - Build tool
- **React Router** - Routing
- **React Query** - Data fetching
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Axios** - HTTP client
- **Lucide React** - Icons

## 🏗️ Структура проекта

```
src/
├── components/         # Переиспользуемые компоненты
│   ├── Header.jsx     # Навигация
│   └── ListingCard.jsx # Карточка товара
├── pages/             # Страницы
│   ├── Home.jsx       # Главная
│   └── Marketplace.jsx # Маркетплейс
├── store/             # State management
│   └── authStore.js   # Авторизация
├── services/          # API
│   └── api.js         # API сервисы
└── App.jsx            # Главный компонент
```

## 🎨 Компоненты

### Header
- Логотип и навигация
- Кнопка входа через Steam
- Меню пользователя с балансом
- Выпадающее меню с профилем

### ListingCard
- Изображение товара
- Rarity badge
- StatTrak badge
- Название и описание
- Цена и продавец
- Счетчик просмотров

## 🔌 API интеграция

### Auth Service
- `getCurrentUser()` - получить пользователя
- `loginWithSteam()` - логин через Steam
- `logout()` - выход

### Marketplace Service
- `getListings()` - получить листинги
- `getListing()` - получить один листинг
- `createListing()` - создать листинг
- `purchaseItem()` - купить товар
- `getMyListings()` - мои листинги

### Steam Service
- `getInventory()` - инвентарь Steam
- `setTradeUrl()` - установить trade URL
- `verifyItem()` - проверить товар
- `getMarketPrice()` - цена на рынке

## 🎯 Страницы

### Home
- Hero секция
- Кнопка входа через Steam
- Статистика
- Описание функций

### Marketplace
- Фильтры (поиск, оружие, rarity, цена)
- Переключение вид (сетка/список)
- Список товаров
- Пагинация

## 🎨 Стили

Использует Tailwind CSS с кастомными компонентами:

```css
.btn-primary - основная кнопка
.btn-secondary - вторичная кнопка
.card - карточка
.input - поле ввода
```

## 🔄 State Management

Zustand store для авторизации:

```javascript
const { user, isAuthenticated, login, logout, fetchCurrentUser } = useAuthStore();
```

## 📡 Real-time

Подготовлен для Socket.io интеграции

## 🚀 Следующие шаги

1. Добавить страницу профиля
2. Страница создания листинга
3. Страница покупки
4. Страница кошелька
5. Real-time уведомления
