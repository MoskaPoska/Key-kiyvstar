# Локальное тестирование с PostgreSQL

## 1. Установка PostgreSQL локально (если нет)

Скачайте и установите PostgreSQL с официального сайта: https://www.postgresql.org/download/

При установке запомните:
- Порт (по умолчанию 5432)
- Пароль суперпользователя postgres

## 2. Создание базы данных

Откройте pgAdmin или командную строку PostgreSQL и выполните:

```sql
CREATE DATABASE keytracker;
```

## 3. Настройка переменных окружения

Создайте файл `.env` в корне проекта или установите переменные окружения:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/keytracker
JWT_SECRET=your-secret-key-here
ADMIN_PASSWORD=admin123
USER_PASSWORD=user123
PORT=3000
```

Где:
- `DATABASE_URL` - строка подключения к PostgreSQL
- `JWT_SECRET` - секретный ключ для JWT токенов
- `ADMIN_PASSWORD` - пароль для администратора
- `USER_PASSWORD` - пароль для обычного пользователя
- `PORT` - порт сервера

## 4. Добавление пользователей в базу данных

Запустите скрипт для создания таблицы пользователей и добавления тестовых пользователей:

```bash
node setup-users.js
```

Или с указанием DATABASE_URL:

```bash
set DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/keytracker
node setup-users.js
```

Скрипт создаст таблицу `people` с полями:
- `id` - уникальный идентификатор
- `name` - имя пользователя (уникальное)
- `phone` - телефон
- `is_admin` - флаг администратора
- `password_hash` - хеш пароля

## 5. Запуск сервера

```bash
node server.js
```

Или через npm:

```bash
npm start
```

## 6. Проверка работы

Откройте браузер и перейдите по адресу: http://localhost:3000

Данные для входа:
- **Администратор**: пароль `admin123`
- **Обычный Пользователь**: пароль `user123`

## 7. Тестирование через API

### Проверка аутентификации:

```bash
# Создайте файл test-login.js
const http = require('http');

const data = JSON.stringify({
  name: 'Администратор',
  password: 'admin123'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', body);
  });
});

req.on('error', e => {
  console.error('Error:', e.message);
});

req.write(data);
req.end();
```

Запустите: `node test-login.js`

## 8. Развертывание на Railway

1. Установите переменные окружения в Railway:
   - `DATABASE_URL` - автоматически предоставляется Railway PostgreSQL
   - `JWT_SECRET` - ваш секретный ключ
   - `ADMIN_PASSWORD` - пароль администратора
   - `USER_PASSWORD` - пароль пользователя
   - `PORT` - Railway автоматически устанавливает PORT

2. Запустите `setup-users.js` один раз после развертывания:
   - Можно добавить в Railway как отдельный скрипт
   - Или выполнить через Railway console

3. Сервер автоматически создаст необходимые таблицы при запуске

## 9. Добавление новых пользователей

Для добавления новых пользователей используйте админ-панель на сайте или выполните SQL-запрос:

```sql
-- Сначала создайте хеш пароля (например, через Node.js)
-- Затем вставьте пользователя
INSERT INTO people (name, phone, is_admin, password_hash) 
VALUES ('Новый Пользователь', '+380XXXXXXXXX', false, '$2b$10$...');
```

Или через API (требуется админ-доступ):

```bash
curl -X POST http://localhost:3000/api/people/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"name":"Новый Пользователь","phone":"+380XXXXXXXXX","isAdmin":false}'
```

## 10. Безопасность

- Пароли хранятся в хешированном виде (bcrypt)
- JWT токены истекают через 24 часа
- Только администраторы могут добавлять/изменять пользователей
- Все API endpoints защищены (кроме login, take, return)

## 11. Устранение проблем

### Ошибка "User not found":
- Проверьте, что пользователи добавлены в базу данных
- Запустите `node setup-users.js`

### Ошибка подключения к базе данных:
- Проверьте правильность `DATABASE_URL`
- Убедитесь, что PostgreSQL запущен
- Проверьте пароль и имя пользователя

### Ошибка "password_hash is null":
- Запустите `node setup-users.js` для добавления пользователей с хешами