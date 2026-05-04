require('../config/loadEnv');

const { Pool } = require('pg');

class Database {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  isRecoverableConnectionError(error) {
    if (!error) return false;

    const message = String(error.message || '').toLowerCase();
    return [
      'etimedout',
      'econnreset',
      'enotfound',
      'eai_again',
      'connection terminated unexpectedly',
      'not queryable',
      'terminating connection',
      'connection error',
    ].some((token) => message.includes(token)) || [
      'ETIMEDOUT',
      'ECONNRESET',
      'ENOTFOUND',
      'EAI_AGAIN',
      '57P01',
    ].includes(String(error.code || ''));
  }

  async resetPool() {
    if (!this.pool) return;

    const currentPool = this.pool;
    this.pool = null;
    this.isConnected = false;

    try {
      await currentPool.end();
    } catch (error) {
      console.error('Error closing PostgreSQL pool:', error);
    }
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
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS) || 10000,
        idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 30000,
        keepAlive: true,
      });

      this.pool.on('error', (error) => {
        this.isConnected = false;
        console.error('PostgreSQL pool error:', error);
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
      await this.connect();
    }

    if (!this.pool) {
      throw new Error('Database not connected');
    }
    
    try {
      const result = await this.pool.query(text, params);
      this.isConnected = true;
      return result;
    } catch (error) {
      if (!(error.code === '23505' && error.constraint === 'users_name_key')) {
        console.error('Database query error:', error);
      }

      if (this.isRecoverableConnectionError(error)) {
        await this.resetPool();
      }

      throw error;
    }
  }

  async end() {
    await this.resetPool();
  }

  isPostgreSQL() {
    return this.pool !== null;
  }
}

module.exports = new Database();
