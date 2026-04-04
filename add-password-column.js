const { Pool } = require('pg');

// PostgreSQL connection for Railway
const DATABASE_URL = 'postgresql://postgres:AlOzXgKnlmVlntIPFDlfnaTVsZMYpQym@postgres.railway.internal:5432/railway';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function addPasswordColumn() {
  try {
    console.log('Adding plain_password column to people table...');
    
    // Add plain_password column if it doesn't exist
    await pool.query('ALTER TABLE people ADD COLUMN IF NOT EXISTS plain_password TEXT DEFAULT \'\'');
    
    console.log('Column added successfully!');
    
    // Check if admin user exists
    const result = await pool.query('SELECT * FROM people WHERE name = $1', ['Администратор']);
    
    if (result.rows.length === 0) {
      console.log('Admin user not found, creating...');
      
      const bcrypt = require('bcrypt');
      const adminHash = await bcrypt.hash('admin123', 10);
      
      await pool.query(
        'INSERT INTO people (name, phone, is_admin, password_hash, plain_password) VALUES ($1, $2, $3, $4, $5)',
        ['Администратор', '+380501234567', true, adminHash, 'admin123']
      );
      
      console.log('Admin user created: Администратор / admin123');
    } else {
      console.log('Admin user already exists');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

addPasswordColumn();