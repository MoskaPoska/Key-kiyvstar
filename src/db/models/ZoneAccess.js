const database = require('../database');

class ZoneAccess {
  constructor() {
    this.memoryData = {};
  }

  async createTable() {
    if (!database.isPostgreSQL()) return;

    await database.query(`
      CREATE TABLE IF NOT EXISTS zone_access (
        zone_num TEXT PRIMARY KEY,
        entries JSONB NOT NULL DEFAULT '[]'::jsonb
      )
    `);
  }

  async getAll() {
    if (!database.isPostgreSQL()) {
      return JSON.parse(JSON.stringify(this.memoryData));
    }

    const result = await database.query('SELECT zone_num, entries FROM zone_access ORDER BY zone_num');
    const data = {};

    for (const row of result.rows) {
      data[row.zone_num] = Array.isArray(row.entries) ? row.entries : [];
    }

    return data;
  }

  async replaceAll(data) {
    const normalized = this.normalizeAll(data);

    if (!database.isPostgreSQL()) {
      this.memoryData = normalized;
      return this.getAll();
    }

    await database.query('BEGIN');
    try {
      await database.query('DELETE FROM zone_access');

      for (const [zoneNum, entries] of Object.entries(normalized)) {
        await database.query(
          'INSERT INTO zone_access (zone_num, entries) VALUES ($1, $2::jsonb)',
          [zoneNum, JSON.stringify(entries)]
        );
      }

      await database.query('COMMIT');
    } catch (error) {
      await database.query('ROLLBACK');
      throw error;
    }

    return normalized;
  }

  normalizeAll(data) {
    const normalized = {};
    const source = data && typeof data === 'object' ? data : {};

    for (const [zoneNum, entries] of Object.entries(source)) {
      if (!Array.isArray(entries)) continue;
      normalized[String(zoneNum)] = entries.map((entry) => this.normalizeEntry(entry));
    }

    return normalized;
  }

  normalizeEntry(entry) {
    const safeEntry = entry && typeof entry === 'object' ? entry : {};
    const tkdEntries = Array.isArray(safeEntry.tkdEntries) ? safeEntry.tkdEntries : [];
    const notes = Array.isArray(safeEntry.notes) ? safeEntry.notes : [];

    return {
      address: String(safeEntry.address || '').trim(),
      code: String(safeEntry.code || '').trim(),
      notes: notes
        .map((note) => String(note || '').trim())
        .filter(Boolean),
      tkdEntries: tkdEntries.map((tkdEntry) => ({
        entrance: String((tkdEntry && tkdEntry.entrance) || '').trim(),
        tkd: String((tkdEntry && tkdEntry.tkd) || '').trim(),
        place: String((tkdEntry && tkdEntry.place) || '').trim()
      })),
      audit: this.normalizeAudit(safeEntry.audit)
    };
  }

  normalizeAudit(audit) {
    const safeAudit = audit && typeof audit === 'object' ? audit : {};
    const createdAt = Number(safeAudit.createdAt);
    const updatedAt = Number(safeAudit.updatedAt);

    return {
      scope: String(safeAudit.scope || '').trim(),
      createdBy: String(safeAudit.createdBy || '').trim(),
      createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : null,
      updatedBy: String(safeAudit.updatedBy || '').trim(),
      updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : null
    };
  }
}

module.exports = new ZoneAccess();
