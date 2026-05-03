const ZoneAccessService = require('../services/ZoneAccessService');
const { parseJsonBody, sendJson } = require('../utils/http');

async function handleGetZoneAccess(req, res) {
  const data = await ZoneAccessService.getAll();
  sendJson(res, 200, data);
}

async function handleGetZoneAccessFull(req, res) {
  const data = await ZoneAccessService.getAllMerged();
  sendJson(res, 200, data);
}

async function handleReplaceZoneAccess(req, res) {
  const body = await parseJsonBody(req);
  const data = await ZoneAccessService.replaceAll(body);
  sendJson(res, 200, { ok: true, data });
}

module.exports = {
  handleGetZoneAccess,
  handleGetZoneAccessFull,
  handleReplaceZoneAccess
};
