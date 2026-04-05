# Настройка и развертывание на Railway

## Быстрый старт

### 1. Подключение репозитория
1. Зайдите в свой аккаунт на [Railway](https://railway.app)
2. Нажмите "New Project"
3. Выберите "Deploy from GitHub repo"
4. Подключите репозиторий `Key-kiyvstar`

### 2. Добавление базы данных PostgreSQL
1. В вашем проекте нажмите "+" → "New" → "Database" → "PostgreSQL"
2. Railway автоматически создаст базу данных и установит переменную окружения `DATABASE_URL`

### 3. Настройка переменных окружения
Добавьте следующие переменные в разделе "Variables":

| Переменная | Значение | Описание |
|------------|----------|----------|
| `JWT_SECRET` | `your-secret-key-here-change-this` | Секретный ключ для JWT (измените на случайную строку!) |
| `NODE_ENV` | `production` | Режим работы (production) |
| `PORT` | `3000` | Порт (Railway установит автоматически, но можно задать) |

**Важно:** Переменная `DATABASE_URL` будет установлена автоматически Railway после добавления PostgreSQL.

### 4. Инициализация базы данных
После первого деплоя выполните инициализацию базы данных:

#### Вариант 1: Через Railway Console (рекомендуется)
1. В Railway Console выберите ваш проект
2. Перейдите в раздел "Open Console" для PostgreSQL
3. Выполните SQL-скрипт:

```sql
-- Создать таблицу пользователей
CREATE TABLE IF NOT EXISTS people (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  phone TEXT DEFAULT '',
  is_admin BOOLEAN DEFAULT FALSE,
  role VARCHAR(20) DEFAULT 'USER',
  password_hash TEXT NOT NULL DEFAULT '',
  plain_password TEXT DEFAULT ''
);

-- Добавить колонку role если её нет (для существующих таблиц)
ALTER TABLE people ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'USER';

-- Мигрировать данные из is_admin в role
UPDATE people SET role = 'ADMIN' WHERE is_admin = true AND (role IS NULL OR role = 'USER');
UPDATE people SET role = 'USER' WHERE is_admin = false AND role IS NULL;
UPDATE people SET role = 'USER' WHERE role IS NULL;

-- Создать администратора по умолчанию
INSERT INTO people (name, phone, is_admin, role, password_hash, plain_password) 
VALUES ('Администратор', '+380501234567', true, 'ADMIN', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin123')
ON CONFLICT (name) DO UPDATE SET 
  is_admin = EXCLUDED.is_admin,
  role = EXCLUDED.role,
  password_hash = EXCLUDED.password_hash,
  plain_password = EXCLUDED.plain_password;

-- Создать таблицу истории
CREATE TABLE IF NOT EXISTS history (
  id SERIAL PRIMARY KEY,
  bundle_id TEXT NOT NULL,
  person_name TEXT,
  action TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

-- Создать таблицу состояния ключей
CREATE TABLE IF NOT EXISTS state (
  bundle_id TEXT PRIMARY KEY,
  person_name TEXT,
  taken_at BIGINT,
  comment TEXT DEFAULT ''
);
```

#### Вариант 2: Через npm скрипты
1. В Railway Console выберите Node.js среду
2. Выполните команды:

```bash
# Добавить колонку role и мигрировать данные
npm run add-role

# Создать администратора
npm run create-admin
```

### 5. Проверка работы
1. После выполнения скриптов перейдите по ссылке вашего приложения
2. Войдите под администратором:
   - **Логин:** `Администратор`
   - **Пароль:** `admin123`

## Учётные данные по умолчанию

| Роль | Логин | Пароль |
|------|-------|--------|
| ADMIN | `Администратор` | `admin123` |
| USER | `Пользователь` | `user123` |

**Важно:** После первого входа смените пароли!

## Создание новых сотрудников

1. Войдите под администратором
2. Нажмите кнопку ⚙️ рядом с полем "ФИО"
3. Заполните форму:
   - **ФИО** - имя сотрудника
   - **Телефон** - контактный номер
   - **Роль** - USER или ADMIN
   - **Пароль** - пароль (мин. 4 символа)
4. Нажмите "Добавить сотрудника"
5. Сохраните показанный пароль и передайте сотруднику

## Управление паролями

Администратор может менять пароли сотрудникам:
1. Откройте панель управления сотрудниками (⚙️)
2. Найдите нужного сотрудника
3. Нажмите кнопку 🔑 (смена пароля)
4. Введите новый пароль и сохраните

## Безопасность

### JWT_SECRET
Обязательно измените `JWT_SECRET` на случайную строку:
```bash
# Сгенерировать случайную строку
openssl rand -hex 32
```

### HTTPS
Railway автоматически предоставляет HTTPS для всех приложений.

### Переменные окружения
Никогда не храните секреты в коде. Используйте переменные окружения Railway.

## Мониторинг и логи

- **Логи приложения:** Railway Dashboard → Ваш проект → "View Logs"
- **Мониторинг базы данных:** Railway Dashboard → PostgreSQL → "Metrics"

## Обновление приложения

При пуше изменений в репозиторий GitHub, Railway автоматически перезапустит приложение с новыми изменениями.

## Возврат к локальной разработке

Для локального тестирования:
1. Скопируйте `.env.example` в `.env`
2. Настройте переменные окружения
3. Запустите `npm install` и `npm start`

## Устранение проблем

### Ошибка "DATABASE_URL not set"
Убедитесь, что PostgreSQL добавлен в проект Railway.

### Не могу войти под администратором
Выполните SQL-скрипт для создания администратора (см. выше).

### Ошибка CORS
Убедитесь, что в коде сервера правильно настроены CORS заголовки.

### Приложение не запускается
Проверьте логи в Railway Console и убедитесь, что все зависимости установлены (`package.json` корректен).

## Дополнительные ресурсы

- [Документация Railway](https://docs.railway.app/)
- [PostgreSQL документация](https://www.postgresql.org/docs/)