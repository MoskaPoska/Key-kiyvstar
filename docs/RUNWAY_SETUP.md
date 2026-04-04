# Настройка базы данных на Railway

## Проблема
На Railway отсутствует колонка `role` в таблице `people`, из-за чего невозможно создать сотрудников и войти на сайт.

## Решение

### Вариант 1: Через Railway Console (рекомендуется)

1. Зайдите в ваш проект на Railway
2. Перейдите в раздел **Console**
3. Выберите **PostgreSQL** базу данных
4. Выполните SQL-запрос:

```sql
-- Добавить колонку role
ALTER TABLE people ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'USER';

-- Перенести значения из is_admin в role
UPDATE people SET role = 'ADMIN' WHERE is_admin = true;
UPDATE people SET role = 'USER' WHERE is_admin = false OR is_admin IS NULL;

-- Создать администратора с паролем
INSERT INTO people (name, phone, is_admin, role, password_hash, plain_password) 
VALUES ('Администратор', '+380501234567', true, 'ADMIN', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin123')
ON CONFLICT (name) DO NOTHING;

-- Проверить результат
SELECT id, name, phone, is_admin, role, plain_password FROM people WHERE name = 'Администратор';
```

### Вариант 2: Через npm скрипты

1. В Railway Console выберите **Node.js** среду
2. Выполните команды:

```bash
# Добавить колонку role
npm run add-role

# Создать администратора
npm run create-admin
```

### Вариант 3: Через скрипты

1. В Railway Console выберите **Node.js** среду
2. Выполните:

```bash
# Запустить скрипт для добавления колонки
node scripts/add-role-column-final.sql

# Запустить скрипт для создания администратора
node scripts/create-admin-user.js
```

## Проверка

После выполнения одного из вариантов:

1. Проверьте, что администратор создан:
```sql
SELECT id, name, phone, is_admin, role FROM people WHERE name = 'Администратор';
```

2. Должны увидеть:
```
id | name        | phone         | is_admin | role
---|-------------|---------------|----------|------
1  | Администратор | +380501234567 | true     | ADMIN
```

3. Теперь можно зайти на сайт:
   - **Логин**: `Администратор`
   - **Пароль**: `admin123`

## Создание новых сотрудников

После настройки базы данных:

1. Зайдите на сайт под администратором
2. Нажмите ⚙️ рядом с полем "ФИО"
3. Нажмите "Добавить сотрудника"
4. Заполните форму:
   - **ФИО** - имя сотрудника
   - **Телефон** - контактный номер
   - **Роль** - USER или ADMIN
5. Система автоматически создаст пароль и покажет его

## Важно

- Пароль показывается только один раз при создании
- Сохраните пароль и передайте сотруднику
- Только администраторы могут создавать новых сотрудников
- Не удаляйте последнего администратора