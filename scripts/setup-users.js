const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Конфигурация базы данных
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.error('Ошибка: Необходимо установить DATABASE_URL или POSTGRES_URL');
  console.log('Пример: set DATABASE_URL=postgresql://user:password@localhost:5432/keytracker');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

// Пользователи для создания
const users = [
  {
    name: 'Администратор',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    phone: '+380501234567',
    isAdmin: true
  },
  {
    name: 'Обычный Пользователь',
    password: process.env.USER_PASSWORD || 'user123',
    phone: '+380671234567',
    isAdmin: false
  }
];

async function setupUsers() {
  try {
    console.log('Подключение к базе данных...');
    
    // Проверяем подключение
    await pool.query('SELECT NOW()');
    console.log('Подключение успешно!');
    
    // Создаем таблицу people если не существует
    console.log('Создание таблицы people...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS people (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        phone TEXT DEFAULT '',
        is_admin BOOLEAN DEFAULT FALSE,
        password_hash TEXT NOT NULL
      )
    `);
    console.log('Таблица people создана/существует');
    
    // Добавляем пользователей
    for (const user of users) {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(user.password, saltRounds);
      
      console.log(`Добавление пользователя: ${user.name}...`);
      
      try {
        const result = await pool.query(
          `INSERT INTO people (name, phone, is_admin, password_hash) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (name) DO UPDATE SET 
           phone = EXCLUDED.phone,
           is_admin = EXCLUDED.is_admin,
           password_hash = EXCLUDED.password_hash
           RETURNING *`,
          [user.name, user.phone, user.isAdmin, passwordHash]
        );
        
        console.log(`✓ Пользователь "${user.name}" добавлен (ID: ${result.rows[0].id})`);
      } catch (err) {
        console.error(`✗ Ошибка при добавлении "${user.name}":`, err.message);
      }
    }
    
    console.log('\n=== Готово! ===');
    console.log('Пользователи для входа:');
    console.log(`  Администратор: пароль "${users[0].password}"`);
    console.log(`  Обычный Пользователь: пароль "${users[1].password}"`);
    console.log('\nПароли можно изменить через переменные окружения:');
    console.log('  ADMIN_PASSWORD - пароль администратора');
    console.log('  USER_PASSWORD - пароль обычного пользователя');
    
  } catch (err) {
    console.error('Ошибка:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupUsers();