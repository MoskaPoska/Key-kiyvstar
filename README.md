# Key Tracker System

Система учёта ключей для Киевстар. Реализована на Node.js с использованием PostgreSQL.

## Особенности

- **Аутентификация**: JWT-токены для безопасного доступа
- **Ролевая модель**: ADMIN и USER с разными правами доступа
- **Реальное время**: SSE для обновления состояния в реальном времени
- **История операций**: Полная аудитория всех действий с ключами
- **REST API**: Современный API для интеграции
- **Frontend**: Чистый JavaScript без фреймворков

## Архитектура (SOLID)

### Backend структура

```
src/
├── db/                    # База данных
│   ├── database.js       # Подключение и управление
│   └── models/           # ORM модели
│       ├── User.js       # Пользователи
│       ├── KeyState.js   # Состояние ключей
│       └── History.js    # История операций
├── middleware/           # Middleware
│   └── auth.js          # Аутентификация
├── services/            # Бизнес-логика
│   ├── AuthService.js   # Авторизация
│   ├── KeyService.js    # Работа с ключами
│   └── UserService.js   # Управление пользователями
├── routes/              # Роутинг
│   ├── auth.js          # Авторизация
│   ├── keys.js          # Ключи
│   └── users.js         # Пользователи
└── server.js            # Главный сервер
```

### Frontend структура

```
public/
├── index.html          # Главная страница
├── styles.css          # Стили
├── app.js              # Главный скрипт
└── js/
    ├── api.js          # API клиент
    └── components/     # UI компоненты
        └── LoginModal.js
```

## Установка

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd key-tracker
```

2. Установите зависимости:
```bash
npm install
```

3. Настройте окружение:
```bash
cp .env.example .env
# Отредактируйте .env с вашими настройками
```

4. Запустите базу данных и инициализацию:
```bash
npm run setup
```

## Запуск

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

Сервер будет доступен на `http://localhost:3000`

## API Endpoints

### Авторизация
- `POST /api/login` - Вход
- `GET /api/whoami` - Информация о пользователе

### Ключи
- `GET /api/state` - Состояние ключей
- `POST /api/take` - Взять ключи
- `POST /api/return` - Вернуть ключи
- `POST /api/comment` - Добавить комментарий
- `GET /api/history` - История операций

### Пользователи
- `GET /api/people` - Список пользователей
- `POST /api/people/add` - Добавить пользователя
- `POST /api/people/update` - Обновить пользователя
- `POST /api/people/delete` - Удалить пользователя
- `POST /api/change-password` - Сменить пароль

### Реальное время
- `GET /api/events` - SSE поток для обновлений

## Роли и права

### ADMIN
- Все права USER
- Управление пользователями
- Установка комментариев
- Просмотр истории

### USER
- Просмотр состояния ключей
- Взятие и возврат ключей
- Просмотр своей истории

## Конфигурация

### Environment Variables

```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/keytracker
JWT_SECRET=your-secret-key
```

### Зоны (data.json)

```json
{
  "zones": [
    {
      "name": "Zone 1",
      "bundles": ["A1", "A2", "A3"]
    }
  ]
}
```

## Безопасность

- JWT токены с 24-часовым сроком действия
- Хэширование паролей с bcrypt
- CORS настройки
- Валидация входных данных
- Ролевая модель доступа

## Разработка

### Структура кода

Проект следует принципам SOLID:

- **S**ingle Responsibility: Каждый класс имеет одну ответственность
- **O**pen/Closed: Классы открыты для расширения, закрыты для модификации
- **L**iskov Substitution: Подтипы должны быть взаимозаменяемыми
- **I**nterface Segregation: Интерфейсы разделены по ответственности
- **D**ependency Inversion: Зависимости от абстракций

### Тестирование

Для тестирования используйте:
```bash
npm test
```

## Деплой

### Railway

1. Создайте приложение на Railway
2. Подключите репозиторий
3. Установите переменные окружения
4. Запустите `npm run setup:prod`

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Лицензия

ISC
