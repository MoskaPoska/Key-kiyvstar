const botDataDB = require('../db/models/BotData');
const database = require('../db/database');

class BotDataService {
  constructor() {
    this.sqliteInitialized = false;
  }

  async initialize() {
    if (this.sqliteInitialized) {
      return;
    }

    await botDataDB.connect();
    this.sqliteInitialized = true;
  }

  async getStats() {
    const pgStats = await this.getPostgreSQLStats();
    if (pgStats) {
      return pgStats;
    }

    await this.initialize();
    return await botDataDB.getStats();
  }

  async getAllKeysBackup(limit = 1000) {
    const pgKeys = await this.getPostgreSQLKeys(limit);
    if (pgKeys) {
      return pgKeys;
    }

    await this.initialize();
    return await botDataDB.getAllKeysBackup(limit);
  }

  async getAllHouses(limit = 1000) {
    const pgHouses = await this.getPostgreSQLHouses(limit);
    if (pgHouses) {
      return pgHouses;
    }

    await this.initialize();
    return await botDataDB.getAllHouses(limit);
  }

  async getAllEquipments(limit = 1000) {
    const pgEquipments = await this.getPostgreSQLEquipments(limit);
    if (pgEquipments) {
      return pgEquipments;
    }

    await this.initialize();
    return await botDataDB.getAllEquipments(limit);
  }

  async getHousesByZone(zone) {
    const pgHouses = await this.queryPostgreSQL(
      'SELECT id, zone, street, house, key_info FROM houses WHERE zone = $1 ORDER BY street, house',
      [String(zone)]
    );
    if (pgHouses) {
      return pgHouses.rows.map(this.mapHouseRow);
    }

    await this.initialize();
    return await botDataDB.getHousesByZone(zone);
  }

  async getKeysByZone(zone) {
    const pgKeys = await this.queryPostgreSQL(
      'SELECT id, zone, street, house, key_info, tkd, num_tkd FROM keys_backup WHERE zone = $1 ORDER BY street, house',
      [String(zone)]
    );
    if (pgKeys) {
      return pgKeys.rows.map(this.mapKeyRow);
    }

    await this.initialize();
    return await botDataDB.getKeysByZone(zone);
  }

  async getEquipmentsByHouse(houseId) {
    const pgEquipments = await this.queryPostgreSQL(
      'SELECT id, house_id, num_tkd, entrance, floor FROM equipments WHERE house_id = $1 ORDER BY id',
      [Number(houseId)]
    );
    if (pgEquipments) {
      return pgEquipments.rows.map(this.mapEquipmentRow);
    }

    await this.initialize();
    return await botDataDB.getEquipmentsByHouse(houseId);
  }

  async searchHouses(query) {
    const searchTerm = `%${query}%`;
    const pgHouses = await this.queryPostgreSQL(
      'SELECT id, zone, street, house, key_info FROM houses WHERE street ILIKE $1 OR house ILIKE $1 ORDER BY street, house',
      [searchTerm]
    );
    if (pgHouses) {
      return pgHouses.rows.map(this.mapHouseRow);
    }

    await this.initialize();
    return await botDataDB.searchHouses(query);
  }

  // Import bot data into PostgreSQL
  async importToPostgreSQL(database) {
    if (!database || !database.isPostgreSQL()) {
      throw new Error('PostgreSQL connection is required for import');
    }

    await this.initialize();

    const result = {
      housesImported: 0,
      keysImported: 0,
      equipmentsImported: 0,
      errors: []
    };

    try {
      // Create tables if they don't exist
      await database.query(`
        CREATE TABLE IF NOT EXISTS houses (
          id INTEGER PRIMARY KEY,
          zone TEXT,
          street TEXT,
          house TEXT,
          key_info TEXT
        )
      `);

      await database.query(`
        CREATE TABLE IF NOT EXISTS keys_backup (
          id INTEGER PRIMARY KEY,
          zone TEXT,
          street TEXT,
          house TEXT,
          key_info TEXT,
          tkd TEXT,
          num_tkd TEXT
        )
      `);

      await database.query(`
        CREATE TABLE IF NOT EXISTS equipments (
          id INTEGER PRIMARY KEY,
          house_id INTEGER,
          num_tkd TEXT,
          entrance TEXT,
          floor TEXT
        )
      `);

      // Import houses
      const houses = await botDataDB.getAllHouses();
      for (const house of houses) {
        try {
          await database.query(
            'INSERT INTO houses (id, zone, street, house, key_info) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET zone = $2, street = $3, house = $4, key_info = $5',
            [house.Id, house.Zone, house.Street, house.House, house.KeyInfo]
          );
          result.housesImported++;
        } catch (err) {
          result.errors.push(`House ${house.Id}: ${err.message}`);
        }
      }

      // Import keys backup
      const keys = await botDataDB.getAllKeysBackup();
      for (const key of keys) {
        try {
          await database.query(
            'INSERT INTO keys_backup (id, zone, street, house, key_info, tkd, num_tkd) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO UPDATE SET zone = $2, street = $3, house = $4, key_info = $5, tkd = $6, num_tkd = $7',
            [key.Id, key.Zone, key.Street, key.House, key.KeyInfo, key.TKD, key.NumTKD]
          );
          result.keysImported++;
        } catch (err) {
          result.errors.push(`Key ${key.Id}: ${err.message}`);
        }
      }

      // Import equipments
      const equipments = await botDataDB.getAllEquipments();
      for (const eq of equipments) {
        try {
          await database.query(
            'INSERT INTO equipments (id, house_id, num_tkd, entrance, floor) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET house_id = $2, num_tkd = $3, entrance = $4, floor = $5',
            [eq.Id, eq.HouseId, eq.NumTKD, eq.Entrance, eq.Floor]
          );
          result.equipmentsImported++;
        } catch (err) {
          result.errors.push(`Equipment ${eq.Id}: ${err.message}`);
        }
      }

    } catch (err) {
      result.errors.push(`Import failed: ${err.message}`);
    }

    return result;
  }

  async getPostgreSQLStats() {
    const keys = await this.queryPostgreSQL('SELECT COUNT(*)::int AS count FROM keys_backup');
    if (!keys) {
      return null;
    }

    const houses = await this.queryPostgreSQL('SELECT COUNT(*)::int AS count FROM houses');
    const equipments = await this.queryPostgreSQL('SELECT COUNT(*)::int AS count FROM equipments');
    const zones = await this.queryPostgreSQL('SELECT DISTINCT zone FROM houses ORDER BY zone');

    return {
      keysBackup: keys.rows[0]?.count || 0,
      houses: houses.rows[0]?.count || 0,
      equipments: equipments.rows[0]?.count || 0,
      zones: zones.rows.map(row => row.zone)
    };
  }

  async getPostgreSQLKeys(limit) {
    const result = await this.queryPostgreSQL(
      'SELECT id, zone, street, house, key_info, tkd, num_tkd FROM keys_backup ORDER BY id LIMIT $1',
      [Number(limit)]
    );
    return result ? result.rows.map(this.mapKeyRow) : null;
  }

  async getPostgreSQLHouses(limit) {
    const result = await this.queryPostgreSQL(
      'SELECT id, zone, street, house, key_info FROM houses ORDER BY id LIMIT $1',
      [Number(limit)]
    );
    return result ? result.rows.map(this.mapHouseRow) : null;
  }

  async getPostgreSQLEquipments(limit) {
    const result = await this.queryPostgreSQL(
      'SELECT id, house_id, num_tkd, entrance, floor FROM equipments ORDER BY id LIMIT $1',
      [Number(limit)]
    );
    return result ? result.rows.map(this.mapEquipmentRow) : null;
  }

  async queryPostgreSQL(sql, params = []) {
    if (!database.isPostgreSQL()) {
      return null;
    }

    try {
      return await database.query(sql, params);
    } catch (error) {
      if (this.isMissingBotDataTable(error)) {
        return null;
      }

      throw error;
    }
  }

  isMissingBotDataTable(error) {
    return error && error.code === '42P01';
  }

  mapHouseRow(row) {
    return {
      Id: row.id,
      Zone: row.zone,
      Street: row.street,
      House: row.house,
      KeyInfo: row.key_info
    };
  }

  mapKeyRow(row) {
    return {
      Id: row.id,
      Zone: row.zone,
      Street: row.street,
      House: row.house,
      KeyInfo: row.key_info,
      TKD: row.tkd,
      NumTKD: row.num_tkd
    };
  }

  mapEquipmentRow(row) {
    return {
      Id: row.id,
      HouseId: row.house_id,
      NumTKD: row.num_tkd,
      Entrance: row.entrance,
      Floor: row.floor
    };
  }
}

module.exports = new BotDataService();
