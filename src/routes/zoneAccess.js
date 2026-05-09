const ZoneAccessService = require('../services/ZoneAccessService');
const AuthService = require('../services/AuthService');
const { parseJsonBody, sendJson } = require('../utils/http');

function isAdminUser(user) {
  return Boolean(user && user.role === 'ADMIN');
}

async function handleGetZoneAccess(req, res, user) {
  const data = await ZoneAccessService.getAll();
  sendJson(res, 200, isAdminUser(user) ? data : ZoneAccessService.stripAuditData(data));
}

async function handleGetZoneAccessFull(req, res, user) {
  const data = await ZoneAccessService.getAllMerged();
  sendJson(res, 200, isAdminUser(user) ? data : ZoneAccessService.stripAuditData(data));
}

async function handleReplaceZoneAccess(req, res, user) {
  const body = await parseJsonBody(req);
  const currentUser = await AuthService.getCurrentUser(req);
  const data = await ZoneAccessService.replaceAll(body, currentUser || user);
  sendJson(res, 200, { ok: true, data });
}

module.exports = {
  handleGetZoneAccess,
  handleGetZoneAccessFull,
  handleReplaceZoneAccess
};
