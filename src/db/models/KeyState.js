const database = require('../database');

class KeyState {
  constructor() {
    // In-memory storage fallback
    this.memoryState = {};
  }

  async createTable() {
    if (database.isPostgreSQL()) {
      const query = `
        CREATE TABLE IF NOT EXISTS state (
          bundle_id TEXT PRIMARY KEY,
          person_name TEXT,
          taken_at BIGINT,
          comment TEXT DEFAULT ''
        )
      `;
      await database.query(query);
    }
  }

  async getAll() {
    if (database.isPostgreSQL()) {
      const query = 'SELECT * FROM state';
      const result = await database.query(query);
      
      const state = {};
      for (const row of result.rows) {
        state[row.bundle_id] = {
          personName: row.person_name,
          takenAt: row.taken_at ? Number(row.taken_at) : null,
          comment: row.comment
        };
      }
      return state;
    } else {
      // Return in-memory state
      return { ...this.memoryState };
    }
  }

  async set(bundleId, data) {
    if (database.isPostgreSQL()) {
      const query = `
        INSERT INTO state (bundle_id, person_name, taken_at, comment) 
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (bundle_id) DO UPDATE SET 
        person_name = EXCLUDED.person_name, 
        taken_at = EXCLUDED.taken_at,
        comment = EXCLUDED.comment
      `;

      await database.query(query, [
        bundleId, data.personName, data.takenAt, data.comment || ''
      ]);
    } else {
      // In-memory storage
      this.memoryState[bundleId] = {
        personName: data.personName,
        takenAt: data.takenAt,
        comment: data.comment || ''
      };
    }
  }

  async delete(bundleId) {
    if (database.isPostgreSQL()) {
      const query = 'DELETE FROM state WHERE bundle_id = $1';
      await database.query(query, [bundleId]);
    } else {
      // In-memory storage
      delete this.memoryState[bundleId];
    }
  }

  async getComment(bundleId) {
    if (database.isPostgreSQL()) {
      const query = 'SELECT comment FROM state WHERE bundle_id = $1';
      const result = await database.query(query, [bundleId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].comment;
    } else {
      // In-memory storage
      return this.memoryState[bundleId]?.comment || null;
    }
  }

  async updateComment(bundleId, comment) {
    if (database.isPostgreSQL()) {
      const query = `
        UPDATE state 
        SET comment = $1 
        WHERE bundle_id = $2
      `;
      await database.query(query, [comment || '', bundleId]);
    } else {
      // In-memory storage
      if (this.memoryState[bundleId]) {
        this.memoryState[bundleId].comment = comment || '';
      }
    }
  }
}

// Export singleton instance
module.exports = new KeyState();