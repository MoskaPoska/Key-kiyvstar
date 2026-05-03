const botDataService = require('./BotDataService');
const fs = require('fs');
const path = require('path');

class ZoneAddressService {
  constructor() {
    this.zoneData = null;
    this.zoneAccessData = null;
  }

  async loadZoneData() {
    if (this.zoneData) {
      return this.zoneData;
    }

    const dataPath = path.join(__dirname, '../data.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    const houses = await botDataService.getAllHouses(5000);
    const keys = await botDataService.getAllKeysBackup(5000);
    const housesByZone = {};
    const keysByZone = {};

    houses.forEach((house) => {
      if (!housesByZone[house.Zone]) {
        housesByZone[house.Zone] = [];
      }
      housesByZone[house.Zone].push(house);
    });

    keys.forEach((key) => {
      if (!keysByZone[key.Zone]) {
        keysByZone[key.Zone] = [];
      }
      keysByZone[key.Zone].push(key);
    });

    this.zoneData = data.zones.map((zone) => {
      const zoneNum = zone.id.replace('zone_', '');
      const zoneHouses = housesByZone[zoneNum] || [];
      const zoneKeys = keysByZone[zoneNum] || [];
      const enrichedBundles = zone.bundles.map((bundleId) => {
        const mainId = bundleId.split('-')[0];

        const matchingHouses = zoneHouses.filter((house) => {
          return (
            (house.House && house.House.includes(mainId)) ||
            (house.KeyInfo && house.KeyInfo.includes(bundleId))
          );
        });

        const matchingKeys = zoneKeys.filter((key) => {
          return (
            (key.House && key.House.includes(mainId)) ||
            (key.KeyInfo && key.KeyInfo.includes(bundleId)) ||
            (key.NumTKD && key.NumTKD.includes(bundleId))
          );
        });

        return {
          id: bundleId,
          addresses: matchingHouses.map((house) => ({
            street: house.Street,
            house: house.House,
            keyInfo: house.KeyInfo,
            source: 'house'
          })),
          keyInfo: matchingKeys.map((key) => ({
            street: key.Street,
            house: key.House,
            keyInfo: key.KeyInfo,
            tkd: key.TKD,
            numTKD: key.NumTKD,
            source: 'keys_backup'
          })),
          hasAddressInfo: matchingHouses.length > 0 || matchingKeys.length > 0
        };
      });

      return {
        ...zone,
        zoneNumber: zoneNum,
        houses: zoneHouses,
        keys: zoneKeys,
        enrichedBundles,
        totalAddresses: zoneHouses.length + zoneKeys.length,
        bundlesWithInfo: enrichedBundles.filter((bundle) => bundle.hasAddressInfo).length
      };
    });

    return this.zoneData;
  }

  async getZone(zoneId) {
    const zones = await this.loadZoneData();
    return zones.find((zone) => zone.id === zoneId);
  }

  async getAllZones() {
    return this.loadZoneData();
  }

  async getZoneAddresses(zoneId) {
    const zone = await this.getZone(zoneId);
    if (!zone) return [];

    const allAddresses = [];
    const seen = new Set();

    zone.houses.forEach((house) => {
      const key = `${house.Street}-${house.House}`;
      if (!seen.has(key)) {
        seen.add(key);
        allAddresses.push({
          type: 'house',
          street: house.Street,
          house: house.House,
          keyInfo: house.KeyInfo,
          zone: house.Zone
        });
      }
    });

    zone.keys.forEach((key) => {
      const keyStr = `${key.Street}-${key.House}`;
      if (!seen.has(keyStr)) {
        seen.add(keyStr);
        allAddresses.push({
          type: 'key_backup',
          street: key.Street,
          house: key.House,
          keyInfo: key.KeyInfo,
          tkd: key.TKD,
          numTKD: key.NumTKD,
          zone: key.Zone
        });
      }
    });

    return allAddresses;
  }

  async getZoneAccessData() {
    if (this.zoneAccessData) {
      return this.zoneAccessData;
    }

    const houses = await botDataService.getAllHouses(5000);
    const keys = await botDataService.getAllKeysBackup(5000);
    const equipments = await botDataService.getAllEquipments(5000);
    const addressesByZone = {};
    const addressIndex = new Map();
    const houseAddressKeyById = new Map();

    const ensureAddress = (zoneNum, street, house) => {
      const zoneKey = String(zoneNum || '').trim();
      const streetValue = String(street || '').trim();
      const houseValue = String(house || '').trim();
      if (!zoneKey || !streetValue || !houseValue) {
        return null;
      }

      if (!addressesByZone[zoneKey]) {
        addressesByZone[zoneKey] = [];
      }

      const mapKey = this.buildAddressMapKey(zoneKey, streetValue, houseValue);
      let entry = addressIndex.get(mapKey);

      if (!entry) {
        entry = {
          address: `${streetValue} ${houseValue}`.trim(),
          code: '',
          notes: [],
          tkdEntries: []
        };
        addressIndex.set(mapKey, entry);
        addressesByZone[zoneKey].push(entry);
      }

      return entry;
    };

    houses.forEach((house) => {
      const entry = ensureAddress(house.Zone, house.Street, house.House);
      if (!entry) return;

      if (house.KeyInfo) {
        this.pushUnique(entry.notes, String(house.KeyInfo).trim());
      }

      houseAddressKeyById.set(Number(house.Id), this.buildAddressMapKey(house.Zone, house.Street, house.House));
    });

    keys.forEach((key) => {
      const entry = ensureAddress(key.Zone, key.Street, key.House);
      if (!entry) return;

      if (key.KeyInfo) {
        this.pushUnique(entry.notes, String(key.KeyInfo).trim());
      }

      const tkdNumbers = this.parseDelimitedList(key.NumTKD);
      const tkdPlaces = this.parseDelimitedList(key.TKD);

      if (tkdNumbers.length) {
        tkdNumbers.forEach((tkdNumber, index) => {
          this.pushUniqueTkdEntry(entry.tkdEntries, {
            entrance: '',
            tkd: tkdNumber,
            place: tkdPlaces[index] || tkdPlaces[0] || ''
          });
        });
      } else {
        tkdPlaces.forEach((place) => {
          this.pushUniqueTkdEntry(entry.tkdEntries, {
            entrance: '',
            tkd: '',
            place
          });
        });
      }
    });

    equipments.forEach((equipment) => {
      const addressKey = houseAddressKeyById.get(Number(equipment.HouseId));
      if (!addressKey) return;

      const entry = addressIndex.get(addressKey);
      if (!entry) return;

      this.pushUniqueTkdEntry(entry.tkdEntries, {
        entrance: equipment.Entrance || '',
        tkd: equipment.NumTKD || '',
        place: equipment.Floor || ''
      });
    });

    Object.values(addressesByZone).forEach((addresses) => {
      addresses.forEach((address) => {
        address.notes = address.notes.filter(Boolean);
        address.tkdEntries = this.removeGenericTkdDuplicates(
          address.tkdEntries.filter((entry) => {
            return entry.entrance || entry.tkd || entry.place;
          })
        );
      });

      addresses.sort((a, b) => a.address.localeCompare(b.address, 'uk', { numeric: true }));
    });

    this.zoneAccessData = addressesByZone;
    return this.zoneAccessData;
  }

  async searchAddresses(query) {
    const searchQuery = String(query || '').trim();
    const normalizedQuery = searchQuery.toLowerCase();
    const houses = await botDataService.searchHouses(searchQuery);
    const allKeys = await botDataService.getAllKeysBackup(5000);

    const matchingKeys = allKeys.filter((key) => {
      return (
        String(key.Street || '').toLowerCase().includes(normalizedQuery) ||
        String(key.House || '').toLowerCase().includes(normalizedQuery) ||
        String(key.KeyInfo || '').toLowerCase().includes(normalizedQuery) ||
        String(key.NumTKD || '').toLowerCase().includes(normalizedQuery) ||
        String(key.TKD || '').toLowerCase().includes(normalizedQuery)
      );
    });

    return {
      houses,
      keys: matchingKeys,
      total: houses.length + matchingKeys.length
    };
  }

  buildAddressMapKey(zoneNum, street, house) {
    return [
      String(zoneNum || '').trim(),
      String(street || '').trim().toLowerCase(),
      String(house || '').trim().toLowerCase()
    ].join('|');
  }

  parseDelimitedList(value) {
    return String(value || '')
      .split(/[,;\n]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  pushUnique(list, value) {
    if (!value) return;
    if (!list.includes(value)) {
      list.push(value);
    }
  }

  pushUniqueTkdEntry(list, entry) {
    const normalizedEntry = {
      entrance: String(entry.entrance || '').trim(),
      tkd: String(entry.tkd || '').trim(),
      place: String(entry.place || '').trim()
    };

    if (!normalizedEntry.entrance && !normalizedEntry.tkd && !normalizedEntry.place) {
      return;
    }

    const exists = list.some((item) => {
      return item.entrance === normalizedEntry.entrance &&
        item.tkd === normalizedEntry.tkd &&
        item.place === normalizedEntry.place;
    });

    if (!exists) {
      list.push(normalizedEntry);
    }
  }

  removeGenericTkdDuplicates(list) {
    const entries = Array.isArray(list) ? list : [];
    const tkdWithEntrance = new Set(
      entries
        .filter((entry) => String((entry && entry.entrance) || '').trim() && String((entry && entry.tkd) || '').trim())
        .map((entry) => String(entry.tkd || '').trim().toLowerCase())
    );

    return entries.filter((entry) => {
      const entrance = String((entry && entry.entrance) || '').trim();
      const tkd = String((entry && entry.tkd) || '').trim().toLowerCase();
      return entrance || !tkd || !tkdWithEntrance.has(tkd);
    });
  }
}

module.exports = new ZoneAddressService();
