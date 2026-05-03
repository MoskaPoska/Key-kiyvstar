const botDataService = require('../services/BotDataService');
const database = require('../db/database');

async function handleBotDataRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;

  try {
    // GET /api/botdata/stats
    if (method === 'GET' && pathname === '/api/botdata/stats') {
      const stats = await botDataService.getStats();
      return { status: 200, data: stats };
    }

    // GET /api/botdata/keys
    if (method === 'GET' && pathname === '/api/botdata/keys') {
      const limit = parseInt(url.searchParams.get('limit')) || 1000;
      const keys = await botDataService.getAllKeysBackup(limit);
      return { status: 200, data: keys };
    }

    // GET /api/botdata/keys/zone/:zone
    if (method === 'GET' && pathname.match(/^\/api\/botdata\/keys\/zone\/[^/]+$/)) {
      const zone = pathname.split('/').pop();
      const keys = await botDataService.getKeysByZone(zone);
      return { status: 200, data: keys };
    }

    // GET /api/botdata/houses
    if (method === 'GET' && pathname === '/api/botdata/houses') {
      const limit = parseInt(url.searchParams.get('limit')) || 1000;
      const houses = await botDataService.getAllHouses(limit);
      return { status: 200, data: houses };
    }

    // GET /api/botdata/houses/zone/:zone
    if (method === 'GET' && pathname.match(/^\/api\/botdata\/houses\/zone\/[^/]+$/)) {
      const zone = pathname.split('/').pop();
      const houses = await botDataService.getHousesByZone(zone);
      return { status: 200, data: houses };
    }

    // GET /api/botdata/houses/search
    if (method === 'GET' && pathname === '/api/botdata/houses/search') {
      const query = url.searchParams.get('q') || '';
      const houses = await botDataService.searchHouses(query);
      return { status: 200, data: houses };
    }

    // GET /api/botdata/equipments
    if (method === 'GET' && pathname === '/api/botdata/equipments') {
      const limit = parseInt(url.searchParams.get('limit')) || 1000;
      const equipments = await botDataService.getAllEquipments(limit);
      return { status: 200, data: equipments };
    }

    // GET /api/botdata/equipments/house/:houseId
    if (method === 'GET' && pathname.match(/^\/api\/botdata\/equipments\/house\/[^/]+$/)) {
      const houseId = pathname.split('/').pop();
      const equipments = await botDataService.getEquipmentsByHouse(houseId);
      return { status: 200, data: equipments };
    }

    // POST /api/botdata/import
    if (method === 'POST' && pathname === '/api/botdata/import') {
      if (!database.isPostgreSQL()) {
        return { status: 400, data: { error: 'PostgreSQL connection is not available' } };
      }
      const result = await botDataService.importToPostgreSQL(database);
      return { status: 200, data: result };
    }

    return { status: 404, data: { error: 'Not found' } };
  } catch (err) {
    console.error('Botdata route error:', err);
    return { status: 500, data: { error: err.message } };
  }
}

module.exports = handleBotDataRequest;
