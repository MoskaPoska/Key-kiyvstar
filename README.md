# Система учета ключей для Киевстар

Веб-приложение для управления ключами и доступом сотрудников к помещениям.

## Особенности

- ✅ Учет ключей по зонам
- ✅ Поиск по зонам и связкам ключей
- ✅ Система ролей (Администратор/Пользователь)
- ✅ Индивидуальные пароли для сотрудников
- ✅ История операций
- ✅ Реальное время обновления данных
- ✅ PostgreSQL база данных
- ✅ JWT аутентификация

## Технологии

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **База данных**: PostgreSQL
- **Аутентификация**: JWT
- **Хеширование паролей**: bcrypt

## Установка

### Требования

- Node.js >= 18.0.0
- PostgreSQL

### Локальная установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/MoskaPoska/Key-kiyvstar.git
cd Key-kiyvstar
```

2. Установите зависимости:
```bash
npm install
```

3. Настройте переменные окружения:
```bash
cp .env.example .env
```

4. Заполните .env файл:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/keytracker
JWT_SECRET=your-secret-key-here
ADMIN_PASSWORD=admin123
USER_PASSWORD=user123
PORT=3000
```

5. Создайте базу данных:
```sql
CREATE DATABASE keytracker;
```

6. Запустите сервер:
```bash
npm start
```

7. Добавьте пользователей:
```bash
npm run setup
```

## Использование

### Запуск сервера

```bash
# Старт в production режиме
npm start

# Старт в development режиме
npm run dev
```

### Добавление пользователей

```bash
# Для локальной разработки
npm run setup

# Для production (Railway)
npm run setup:prod
```

### Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `DATABASE_URL` | Строка подключения к PostgreSQL | - |
| `JWT_SECRET` | Секретный ключ для JWT | - |
| `ADMIN_PASSWORD` | Пароль администратора | admin123 |
| `USER_PASSWORD` | Пароль пользователя | user123 |
| `PORT` | Порт сервера | 3000 |

## Документация

- [Локальное тестирование](README_LOCAL_TEST.md)
- [Роли и пароли](README_ROLES_AND_PASSWORDS.md)

## API

### Аутентификация

```bash
POST /api/login
Content-Type: application/json

{
  "name": "Администратор",
  "password": "admin123"
}
```

### Управление ключами

```bash
# Получить состояние ключей
GET /api/state

# Взять ключи
POST /api/take
{
  "bundleId": "zone1-key1",
  "personName": "Иван Иванов"
}

# Вернуть ключи
POST /api/return
{
  "bundleId": "zone1-key1"
}
```

### Управление пользователями (только для администраторов)

```bash
# Получить список пользователей
GET /api/people

# Добавить пользователя
POST /api/people/add
{
  "name": "Новый Пользователь",
  "phone": "+380501234567",
  "isAdmin": false
}

# Изменить пароль
POST /api/change-password
{
  "id": 1,
  "newPassword": "newpassword123"
}
```

## Развертывание на Railway

1. Зарегистрируйтесь на [Railway](https://railway.app)
2. Подключите репозиторий GitHub
3. Добавьте PostgreSQL базу данных
4. Установите переменные окружения в Railway
5. Запустите `npm run setup:prod` для создания пользователей

## Безопасность

- Пароли хранятся в хешированном виде (bcrypt)
- JWT токены с ограниченным сроком действия
- Разграничение прав доступа по ролям
- CORS настройки для безопасности

## Лицензия

ISC