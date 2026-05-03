const database = require('../src/db/database');
const { initDatabase } = require('../src/db/init');

async function main() {
  try {
    const result = await initDatabase();

    if (result.storage !== 'postgres') {
      console.error('DATABASE_URL or POSTGRES_URL is not set. PostgreSQL initialization was skipped.');
      process.exitCode = 1;
      return;
    }

    console.log('Database schema is ready: users, state, history, zone_access.');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    process.exitCode = 1;
  } finally {
    await database.end();
  }
}

main();
