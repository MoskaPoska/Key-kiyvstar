const ZoneAccess = require('../db/models/ZoneAccess');
const ZoneAddressService = require('./ZoneAddressService');

class ZoneAccessService {
  static async getAll() {
    return ZoneAccess.getAll();
  }

  static async getAllMerged() {
    const savedData = await ZoneAccess.getAll();
    let importedData = {};

    try {
      importedData = await ZoneAddressService.getZoneAccessData();
    } catch (error) {
      console.error('Failed to load imported zone access data, using saved database data only:', error);
      importedData = {};
    }

    return this.mergeZoneAccessData(importedData, savedData);
  }

  static async replaceAll(data) {
    return ZoneAccess.replaceAll(data);
  }

  static mergeZoneAccessData(importedData, savedData) {
    const result = {};
    const zoneNumbers = new Set([
      ...Object.keys(importedData || {}),
      ...Object.keys(savedData || {})
    ]);

    zoneNumbers.forEach((zoneNum) => {
      const importedAddresses = Array.isArray(importedData?.[zoneNum]) ? importedData[zoneNum] : [];
      const savedAddresses = Array.isArray(savedData?.[zoneNum]) ? savedData[zoneNum] : [];
      const merged = [];
      const byAddress = new Map();

      importedAddresses.forEach((entry) => {
        const normalized = this.normalizeEntry(entry);
        const key = this.getAddressKey(normalized.address);
        byAddress.set(key, normalized);
        merged.push(normalized);
      });

      savedAddresses.forEach((entry) => {
        const normalized = this.normalizeEntry(entry);
        const key = this.getAddressKey(normalized.address);
        const existing = byAddress.get(key);

        if (!existing) {
          byAddress.set(key, normalized);
          merged.push(normalized);
          return;
        }

        existing.code = normalized.code || existing.code;
        existing.notes = this.mergeStringLists(existing.notes, normalized.notes);
        existing.tkdEntries = this.mergeTkdLists(existing.tkdEntries, normalized.tkdEntries);
      });

      result[zoneNum] = merged;
    });

    return result;
  }

  static normalizeEntry(entry) {
    const safeEntry = entry && typeof entry === 'object' ? entry : {};
    const tkdEntries = Array.isArray(safeEntry.tkdEntries) ? safeEntry.tkdEntries : [];
    const notes = Array.isArray(safeEntry.notes) ? safeEntry.notes : [];

    return {
      address: String(safeEntry.address || '').trim(),
      code: String(safeEntry.code || '').trim(),
      notes: this.mergeStringLists([], notes),
      tkdEntries: this.mergeTkdLists([], tkdEntries)
    };
  }

  static mergeStringLists(base, extra) {
    const result = Array.isArray(base) ? [...base] : [];
    (Array.isArray(extra) ? extra : []).forEach((item) => {
      const value = String(item || '').trim();
      if (value && !result.includes(value)) {
        result.push(value);
      }
    });
    return result;
  }

  static mergeTkdLists(base, extra) {
    const result = Array.isArray(base) ? [...base] : [];
    (Array.isArray(extra) ? extra : []).forEach((item) => {
      const normalized = {
        entrance: String((item && item.entrance) || '').trim(),
        tkd: String((item && item.tkd) || '').trim(),
        place: String((item && item.place) || '').trim()
      };

      if (!normalized.entrance && !normalized.tkd && !normalized.place) {
        return;
      }

      const exists = result.some((current) => {
        return String(current.entrance || '').trim() === normalized.entrance &&
          String(current.tkd || '').trim() === normalized.tkd &&
          String(current.place || '').trim() === normalized.place;
      });

      if (!exists) {
        result.push(normalized);
      }
    });
    return result;
  }

  static getAddressKey(address) {
    return String(address || '').trim().toLowerCase();
  }
}

module.exports = ZoneAccessService;
