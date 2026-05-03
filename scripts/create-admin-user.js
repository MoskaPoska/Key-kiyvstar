const bcrypt = require('bcrypt');
const database = require('../src/db/database');
const { initDatabase } = require('../src/db/init');

async function main() {
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  try {
    const result = await initDatabase();

    if (result.storage !== 'postgres') {
      throw new Error('DATABASE_URL or POSTGRES_URL is not set');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const saved = await database.query(
      `
        INSERT INTO users (name, phone, password_hash, is_admin, role)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (name) DO UPDATE SET
          phone = EXCLUDED.phone,
          password_hash = EXCLUDED.password_hash,
          is_admin = EXCLUDED.is_admin,
          role = EXCLUDED.role
        RETURNING id, name, phone, is_admin, role
      `,
      ['Администратор', '+380501234567', passwordHash, true, 'ADMIN']
    );

    console.log('Admin user is ready:');
    console.log(saved.rows[0]);
    console.log(`Password: ${password}`);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exitCode = 1;
  } finally {
    await database.end();
  }
}

main();
