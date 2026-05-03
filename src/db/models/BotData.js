const initSqlJs = require('sql.js').default;
const fs = require('fs');
const path = require('path');

class BotDataDB {
  constructor() {
    this.db = null;
    this.SQL = null;
    this.isConnected = false;
  }

  async connect() {
    if (this.db) {
      return this.db;
    }

    try {
      this.SQL = await initSqlJs();
      const dbPath = path.join(__dirname, '../../../bot_data.db');
      const fileBuffer = fs.readFileSync(dbPath);
      this.db = new this.SQL.Database(fileBuffer);
      this.isConnected = true;
      console.log('Connected to bot_data.db (SQLite)');
      return this.db;
    } catch (error) {
      console.error('Failed to connect to bot_data.db:', error);
      this.db = null;
      this.isConnected = false;
      return null;
    }
  }

  async query(sql, params = []) {
    if (!this.db) {
      throw new Error('BotDataDB not connected');
    }
    try {
      const result = this.db.exec(sql);
      return result;
    } catch (error) {
      console.error('BotDataDB query error:', error);
      throw error;
    }
  }

  // Get all keys backup records
  async getAllKeysBackup(limit = 1000) {
    const result = this.db.exec(
      'SELECT * FROM Keys_Backup ORDER BY Id LIMIT ' + limit
    );
    if (result.length === 0) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
  }

  // Get all houses
  async getAllHouses(limit = 1000) {
    const result = this.db.exec(
      'SELECT * FROM Houses ORDER BY Id LIMIT ' + limit
    );
    if (result.length === 0) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
  }

  // Get all equipments
  async getAllEquipments(limit = 1000) {
    const result = this.db.exec(
      'SELECT * FROM Equipments ORDER BY Id LIMIT ' + limit
    );
    if (result.length === 0) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
  }

  // Get houses by zone
  async getHousesByZone(zone) {
    const result = this.db.exec(
      'SELECT * FROM Houses WHERE Zone = ? ORDER BY Street, House',
      [zone]
    );
    if (result.length === 0) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
  }

  // Get keys by zone
  async getKeysByZone(zone) {
    const result = this.db.exec(
      'SELECT * FROM Keys_Backup WHERE Zone = ? ORDER BY Street, House',
      [zone]
    );
    if (result.length === 0) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
  }

  // Get equipments by house
  async getEquipmentsByHouse(houseId) {
    const result = this.db.exec(
      'SELECT * FROM Equipments WHERE HouseId = ?',
      [houseId]
    );
    if (result.length === 0) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
  }

  // Search houses by street or house number
  async searchHouses(query) {
    const result = this.db.exec(
      'SELECT * FROM Houses WHERE Street LIKE ? OR House LIKE ? ORDER BY Street, House',
      ['%' + query + '%', '%' + query + '%']
    );
    if (result.length === 0) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
  }

  // Get statistics
  async getStats() {
    const keysCount = this.db.exec('SELECT COUNT(*) as cnt FROM Keys_Backup')[0].values[0][0];
    const housesCount = this.db.exec('SELECT COUNT(*) as cnt FROM Houses')[0].values[0][0];
    const equipmentsCount = this.db.exec('SELECT COUNT(*) as cnt FROM Equipments')[0].values[0][0];
    
    const zones = this.db.exec('SELECT DISTINCT Zone FROM Houses ORDER BY Zone');
    const zoneList = zones[0].values.map(r => r[0]);

    return {
      keysBackup: keysCount,
      houses: housesCount,
      equipments: equipmentsCount,
      zones: zoneList
    };
  }

  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isConnected = false;
    }
  }
}

module.exports = new BotDataDB();