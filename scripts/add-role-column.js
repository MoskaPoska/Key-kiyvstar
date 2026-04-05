const { Pool } = require('pg');

// Get database URL from environment or use default
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set. Please set the environment variable.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addRoleColumn() {
  try {
    console.log('Adding role column to people table...');
    
    // Add role column if it doesn't exist
    await pool.query(`
      ALTER TABLE people ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'USER';
    `);
    console.log('Role column added (or already exists)');
    
    // Migrate existing is_admin values to role
    await pool.query(`
      UPDATE people SET role = 'ADMIN' WHERE is_admin = true AND (role IS NULL OR role = 'USER');
    `);
    await pool.query(`
      UPDATE people SET role = 'USER' WHERE is_admin = false AND role IS NULL;
    `);
    await pool.query(`
      UPDATE people SET role = 'USER' WHERE role IS NULL;
    `);
    console.log('Role values migrated from is_admin');
    
    // Verify the changes
    const result = await pool.query(`
      SELECT id, name, phone, is_admin, role, plain_password 
      FROM people 
      ORDER BY name;
    `);
    
    console.log('\nCurrent users:');
    result.rows.forEach(row => {
      console.log(`  ${row.name} - Role: ${row.role}, Is Admin: ${row.is_admin}`);
    });
    
    // Check table structure
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'people' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\nTable structure:');
    columns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
    
    console.log('\nDone! Role column is ready.');
    
  } catch (error) {
    console.error('Error adding role column:', error);
  } finally {
    await pool.end();
  }
}

addRoleColumn();