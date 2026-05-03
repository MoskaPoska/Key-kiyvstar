const database = require('../src/db/database');
const User = require('../src/db/models/User');

async function main() {
  try {
    await database.connect();

    if (!database.isPostgreSQL()) {
      throw new Error('DATABASE_URL or POSTGRES_URL is not set');
    }

    console.log('Ensuring role column exists on users table...');
    await User.createTable();
    await User.addRoleColumn();
    await User.migrateRoles();
    console.log('Role column is ready on users table.');
  } catch (error) {
    console.error('Error updating users.role:', error);
    process.exitCode = 1;
  } finally {
    await database.end();
  }
}

main();
