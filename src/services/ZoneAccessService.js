const ZoneAccess = require('../db/models/ZoneAccess');
const ZoneAddressService = require('./ZoneAddressService');
const User = require('../db/models/User');

const ACCESS_AUDIT_SCOPE = 'access-admin-log-v2';

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

  static async replaceAll(data, user = null) {
    const withAudit = await this.applyAuditMetadata(data, user);
    return ZoneAccess.replaceAll(withAudit);
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
        existing.audit = this.normalizeAudit(normalized.audit);
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
      tkdEntries: this.mergeTkdLists([], tkdEntries),
      audit: this.normalizeAudit(safeEntry.audit)
    };
  }

  static normalizeAudit(audit) {
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

  static stripAuditData(data) {
    const source = data && typeof data === 'object' ? data : {};
    const sanitized = {};

    Object.entries(source).forEach(([zoneNum, entries]) => {
      if (!Array.isArray(entries)) {
        return;
      }

      sanitized[zoneNum] = entries.map((entry) => {
        const normalized = this.normalizeEntry(entry);
        const { audit, ...rest } = normalized;
        void audit;
        if (Array.isArray(rest.notes) && rest.notes.length === 0) {
          delete rest.notes;
        }
        return rest;
      });
    });

    return sanitized;
  }

  static async applyAuditMetadata(data, user = null) {
    const normalized = ZoneAccess.normalizeAll(data);
    const currentData = await ZoneAccess.getAll();
    const actor = await this.resolveAuditActorName(user);
    const now = Date.now();

    Object.entries(normalized).forEach(([zoneNum, entries]) => {
      const currentEntries = Array.isArray(currentData[zoneNum]) ? currentData[zoneNum] : [];
      const currentByAddress = new Map();

      currentEntries.forEach((entry) => {
        const normalizedCurrent = this.normalizeEntry(entry);
        currentByAddress.set(this.getAddressKey(normalizedCurrent.address), normalizedCurrent);
      });

      normalized[zoneNum] = entries.map((entry) => {
        const existingByAddress = currentByAddress.get(this.getAddressKey(entry.address));
        const payloadAudit = this.normalizeAudit(entry.audit);
        const baseAudit = payloadAudit.createdAt ? payloadAudit : this.normalizeAudit(existingByAddress && existingByAddress.audit);
        const unchanged = existingByAddress && this.entriesEqual(existingByAddress, entry);
        const fallbackActor = actor || baseAudit.updatedBy || baseAudit.createdBy || 'Unknown';

        if (unchanged) {
          return {
            ...entry,
            audit: baseAudit
          };
        }

        if (baseAudit.createdAt) {
          return {
            ...entry,
            audit: {
              scope: baseAudit.scope || ACCESS_AUDIT_SCOPE,
              createdBy: baseAudit.createdBy || fallbackActor,
              createdAt: baseAudit.createdAt,
              updatedBy: fallbackActor,
              updatedAt: actor ? now : (baseAudit.updatedAt || baseAudit.createdAt)
            }
          };
        }

        return {
          ...entry,
          audit: {
            scope: ACCESS_AUDIT_SCOPE,
            createdBy: fallbackActor,
            createdAt: now,
            updatedBy: fallbackActor,
            updatedAt: now
          }
        };
      });
    });

    return normalized;
  }

  static async resolveAuditActorName(user) {
    const directName = String(user && user.name ? user.name : '').trim();
    if (directName) {
      return directName;
    }

    const userId = Number(user && user.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      return '';
    }

    try {
      const resolvedUser = await User.findById(userId, user && user.source);
      return String(resolvedUser && resolvedUser.name ? resolvedUser.name : '').trim();
    } catch (error) {
      console.error('Failed to resolve audit actor name:', error);
      return '';
    }
  }

  static entriesEqual(left, right) {
    const a = this.normalizeEntry(left);
    const b = this.normalizeEntry(right);

    return a.address === b.address &&
      a.code === b.code &&
      JSON.stringify(a.notes) === JSON.stringify(b.notes) &&
      JSON.stringify(a.tkdEntries) === JSON.stringify(b.tkdEntries);
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
