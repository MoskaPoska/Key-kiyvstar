const bcrypt = require('bcrypt');

const database = require('../src/db/database');
const { initDatabase } = require('../src/db/init');

async function tableExists(tableName) {
  const result = await database.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      ) AS exists
    `,
    [tableName]
  );

  return !!(result.rows[0] && result.rows[0].exists);
}

async function main() {
  try {
    const result = await initDatabase();

    if (result.storage !== 'postgres') {
      throw new Error('DATABASE_URL or POSTGRES_URL is not set');
    }

    const peopleExists = await tableExists('people');
    if (!peopleExists) {
      console.log('Table "people" not found. Nothing to migrate.');
      return;
    }

    const peopleResult = await database.query(`
      SELECT id, name, phone, is_admin, role, password_hash, plain_password
      FROM people
      ORDER BY id
    `);

    if (!peopleResult.rows.length) {
      console.log('Table "people" is empty. Nothing to migrate.');
      return;
    }

    let migratedCount = 0;

    for (const row of peopleResult.rows) {
      const name = String(row.name || '').trim();
      if (!name) continue;

      let passwordHash = String(row.password_hash || '').trim();
      const plainPassword = String(row.plain_password || '').trim();
      const isAdmin = !!row.is_admin;
      const role = String(row.role || '').trim() || (isAdmin ? 'ADMIN' : 'USER');

      if (!passwordHash && plainPassword) {
        passwordHash = await bcrypt.hash(plainPassword, 10);
      }

      if (!passwordHash) {
        console.warn(`Skipping "${name}" because no password data was found.`);
        continue;
      }

      await database.query(
        `
          INSERT INTO users (name, phone, password_hash, is_admin, role)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (name) DO UPDATE SET
            phone = EXCLUDED.phone,
            password_hash = EXCLUDED.password_hash,
            is_admin = EXCLUDED.is_admin,
            role = EXCLUDED.role
        `,
        [name, String(row.phone || '').trim(), passwordHash, isAdmin, role]
      );

      migratedCount += 1;
    }

    console.log(`Migrated ${migratedCount} user(s) from people to users.`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await database.end();
  }
}

main();
