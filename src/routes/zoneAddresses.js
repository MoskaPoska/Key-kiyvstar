const zoneAddressService = require('../services/ZoneAddressService');

async function handleZoneAddressRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method;

  try {
    // GET /api/zones/addresses - Get all zones with addresses
    if (method === 'GET' && pathname === '/api/zones/addresses') {
      const zones = await zoneAddressService.getAllZones();
      return { status: 200, data: zones };
    }

    // GET /api/zones/:zoneId/addresses - Get addresses for a specific zone
    if (method === 'GET' && pathname.match(/^\/api\/zones\/[^/]+\/addresses$/)) {
      const zoneId = pathname.split('/')[2];
      const addresses = await zoneAddressService.getZoneAddresses(zoneId);
      const zone = await zoneAddressService.getZone(zoneId);
      return { 
        status: 200, 
        data: { 
          zone: zone,
          addresses: addresses 
        } 
      };
    }

    // GET /api/zones/:zoneId - Get zone details
    if (method === 'GET' && pathname.match(/^\/api\/zones\/[^/]+$/)) {
      const zoneId = pathname.split('/')[2];
      const zone = await zoneAddressService.getZone(zoneId);
      if (!zone) {
        return { status: 404, data: { error: 'Zone not found' } };
      }
      return { status: 200, data: zone };
    }

    // GET /api/zones - Get all zones (summary)
    if (method === 'GET' && pathname === '/api/zones') {
      const zones = await zoneAddressService.getAllZones();
      const summary = zones.map(z => ({
        id: z.id,
        name: z.name,
        zoneNumber: z.zoneNumber,
        totalAddresses: z.totalAddresses,
        bundlesWithInfo: z.bundlesWithInfo,
        totalBundles: z.bundles.length
      }));
      return { status: 200, data: summary };
    }

    // GET /api/search/addresses - Search addresses
    if (method === 'GET' && pathname === '/api/search/addresses') {
      const query = url.searchParams.get('q') || '';
      if (!query) {
        return { status: 400, data: { error: 'Query parameter "q" is required' } };
      }
      const results = await zoneAddressService.searchAddresses(query);
      return { status: 200, data: results };
    }

    return { status: 404, data: { error: 'Not found' } };
  } catch (err) {
    console.error('Zone address route error:', err);
    return { status: 500, data: { error: err.message } };
  }
}

module.exports = handleZoneAddressRequest;