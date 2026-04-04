const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Get database URL from environment or use default
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:YOUR_PASSWORD@localhost:5432/keytracker';

async function createAdminUser() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('Creating admin user...');
    
    // Hash the password
    const password = 'admin123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create admin user
    const result = await pool.query(
      `INSERT INTO people (name, phone, is_admin, role, password_hash, plain_password) 
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (name) DO UPDATE SET 
         is_admin = EXCLUDED.is_admin,
         role = EXCLUDED.role,
         password_hash = EXCLUDED.password_hash,
         plain_password = EXCLUDED.plain_password
       RETURNING id, name, phone, is_admin, role`,
      ['Администратор', '+380501234567', true, 'ADMIN', passwordHash, password]
    );

    console.log('Admin user created successfully:');
    console.log(`ID: ${result.rows[0].id}`);
    console.log(`Name: ${result.rows[0].name}`);
    console.log(`Phone: ${result.rows[0].phone}`);
    console.log(`Is Admin: ${result.rows[0].is_admin}`);
    console.log(`Role: ${result.rows[0].role}`);
    console.log(`Password: ${password}`);

    // Verify the user exists
    const verifyResult = await pool.query(
      'SELECT id, name, phone, is_admin, role FROM people WHERE name = $1',
      ['Администратор']
    );

    console.log('\nVerification:');
    console.log(verifyResult.rows[0]);

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await pool.end();
  }
}

createAdminUser();