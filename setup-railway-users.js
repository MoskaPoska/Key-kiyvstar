const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// PostgreSQL connection for Railway
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function setupUsers() {
  try {
    console.log('Setting up users for Railway...');
    
    // Create default users with hashed passwords
    const adminHash = await bcrypt.hash('admin123', 10);
    const userHash = await bcrypt.hash('user123', 10);
    
    // Clear existing users
    await pool.query('DELETE FROM people');
    
    // Add admin user
    await pool.query(
      'INSERT INTO people (name, phone, is_admin, password_hash, plain_password) VALUES ($1, $2, $3, $4, $5)',
      ['Администратор', '+380501234567', true, adminHash, 'admin123']
    );
    
    // Add regular user
    await pool.query(
      'INSERT INTO people (name, phone, is_admin, password_hash, plain_password) VALUES ($1, $2, $3, $4, $5)',
      ['Пользователь', '', false, userHash, 'user123']
    );
    
    console.log('Users created successfully!');
    console.log('Admin: Администратор / admin123');
    console.log('User: Пользователь / user123');
    
  } catch (error) {
    console.error('Error setting up users:', error);
  } finally {
    await pool.end();
  }
}

setupUsers();