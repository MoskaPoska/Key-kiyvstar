const database = require('../database');

class History {
  constructor() {
    // In-memory storage fallback
    this.memoryHistory = [];
  }

  async createTable() {
    if (database.isPostgreSQL()) {
      const query = `
        CREATE TABLE IF NOT EXISTS history (
          id SERIAL PRIMARY KEY,
          bundle_id TEXT NOT NULL,
          person_name TEXT,
          action TEXT NOT NULL,
          timestamp BIGINT NOT NULL
        )
      `;
      await database.query(query);
    }
  }

  async getAll(limit = 100) {
    if (database.isPostgreSQL()) {
      const query = `
        SELECT * FROM history 
        ORDER BY timestamp DESC 
        LIMIT $1
      `;
      const result = await database.query(query, [limit]);
      
      return result.rows.map(row => ({
        id: row.id,
        bundleId: row.bundle_id,
        personName: row.person_name,
        action: row.action,
        timestamp: Number(row.timestamp)
      }));
    } else {
      // Return in-memory history
      return [...this.memoryHistory]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    }
  }

  async add(bundleId, personName, action) {
    if (database.isPostgreSQL()) {
      const query = `
        INSERT INTO history (bundle_id, person_name, action, timestamp) 
        VALUES ($1, $2, $3, $4)
      `;
      await database.query(query, [bundleId, personName, action, Date.now()]);
    } else {
      // In-memory storage
      this.memoryHistory.push({
        id: this.memoryHistory.length + 1,
        bundleId,
        personName,
        action,
        timestamp: Date.now()
      });
    }
  }

  async getByBundle(bundleId, limit = 50) {
    if (database.isPostgreSQL()) {
      const query = `
        SELECT * FROM history 
        WHERE bundle_id = $1 
        ORDER BY timestamp DESC 
        LIMIT $2
      `;
      const result = await database.query(query, [bundleId, limit]);
      
      return result.rows.map(row => ({
        id: row.id,
        bundleId: row.bundle_id,
        personName: row.person_name,
        action: row.action,
        timestamp: Number(row.timestamp)
      }));
    } else {
      // In-memory storage
      return this.memoryHistory
        .filter(h => h.bundleId === bundleId)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    }
  }

  async getByPerson(personName, limit = 50) {
    if (database.isPostgreSQL()) {
      const query = `
        SELECT * FROM history 
        WHERE person_name = $1 
        ORDER BY timestamp DESC 
        LIMIT $2
      `;
      const result = await database.query(query, [personName, limit]);
      
      return result.rows.map(row => ({
        id: row.id,
        bundleId: row.bundle_id,
        personName: row.person_name,
        action: row.action,
        timestamp: Number(row.timestamp)
      }));
    } else {
      // In-memory storage
      return this.memoryHistory
        .filter(h => h.personName === personName)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    }
  }
}

// Export singleton instance
module.exports = new History();