const database = require('../src/db/database');
const botDataService = require('../src/services/BotDataService');

async function migrateBotData() {
  console.log('Starting bot data migration...');
  
  try {
    // Connect to PostgreSQL
    const pool = await database.connect();
    if (!pool) {
      console.error('Failed to connect to PostgreSQL');
      console.log('Please set DATABASE_URL environment variable');
      process.exit(1);
    }
    
    console.log('Connected to PostgreSQL');
    
    // Initialize bot data connection
    await botDataService.initialize();
    
    // Import data
    console.log('Importing bot data to PostgreSQL...');
    const result = await botDataService.importToPostgreSQL(database);
    
    console.log('\n=== Migration Results ===');
    console.log('Houses imported:', result.housesImported);
    console.log('Keys imported:', result.keysImported);
    console.log('Equipments imported:', result.equipmentsImported);
    
    if (result.errors.length > 0) {
      console.log('\nErrors:', result.errors.length);
      result.errors.slice(0, 10).forEach(err => console.log('  -', err));
      if (result.errors.length > 10) {
        console.log('  ... and', result.errors.length - 10, 'more errors');
      }
    } else {
      console.log('\nMigration completed successfully!');
    }
    
    await database.end();
    process.exit(0);
    
  } catch (err) {
    console.error('Migration failed:', err);
    await database.end();
    process.exit(1);
  }
}

migrateBotData();