const KeyState = require('../db/models/KeyState');
const History = require('../db/models/History');

class KeyService {
  static async getState() {
    return await KeyState.getAll();
  }

  static async takeKeys(bundleIds, personName) {
    const results = [];
    
    for (const bundleId of bundleIds) {
      try {
        await KeyState.set(bundleId, {
          personName: personName,
          takenAt: Date.now(),
          comment: ''
        });
        
        await History.add(bundleId, personName, 'take');
        results.push({ bundleId, success: true });
      } catch (error) {
        results.push({ bundleId, success: false, error: error.message });
      }
    }
    
    return results;
  }

  static async returnKeys(bundleIds) {
    const results = [];
    
    for (const bundleId of bundleIds) {
      try {
        const state = await KeyState.getAll();
        const currentHolder = state[bundleId]?.personName;
        
        await KeyState.delete(bundleId);
        
        if (currentHolder) {
          await History.add(bundleId, currentHolder, 'return');
        }
        
        results.push({ bundleId, success: true });
      } catch (error) {
        results.push({ bundleId, success: false, error: error.message });
      }
    }
    
    return results;
  }

  static async setComment(bundleId, comment) {
    try {
      await KeyState.updateComment(bundleId, comment);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getHistory(limit = 100) {
    return await History.getAll(limit);
  }

  static async addHistory(bundleId, personName, action) {
    try {
      await History.add(bundleId, personName, action);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = KeyService;