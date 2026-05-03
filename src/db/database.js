require('../config/loadEnv');

const { Pool } = require('pg');

class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.pool) {
      return this.pool;
    }

    const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    
    if (!DATABASE_URL) {
      console.error('DATABASE_URL not set. Using in-memory storage.');
      return null;
    }

    try {
      this.pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });

      // Test connection
      await this.pool.query('SELECT NOW()');
      this.isConnected = true;
      console.log('Connected to PostgreSQL database');
      
      return this.pool;
    } catch (error) {
      console.error('Failed to connect to database:', error);
      this.pool = null;
      return null;
    }
  }

  async query(text, params = []) {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    
    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (error) {
      if (!(error.code === '23505' && error.constraint === 'users_name_key')) {
        console.error('Database query error:', error);
      }
      throw error;
    }
  }

  async end() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
    }
  }

  isPostgreSQL() {
    return this.pool !== null;
  }
}

module.exports = new Database();
