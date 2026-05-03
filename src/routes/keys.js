const KeyService = require('../services/KeyService');
const { parseJsonBody, sendJson } = require('../utils/http');

async function handleGetState(req, res) {
  const state = await KeyService.getState();
  const zones = getDefaultZones();
  sendJson(res, 200, { zones, state });
}

async function handleTakeKeys(req, res) {
  const { bundleId, personName } = await parseJsonBody(req);

  if (!bundleId || !personName || !String(personName).trim()) {
    sendJson(res, 400, { error: 'Missing bundleId or personName' });
    return;
  }

  const results = await KeyService.takeKeys([bundleId], String(personName).trim());
  if (results[0].success) {
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 500, { error: results[0].error });
}

async function handleReturnKeys(req, res) {
  const { bundleId } = await parseJsonBody(req);
  const results = await KeyService.returnKeys([bundleId]);

  if (results[0].success) {
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 500, { error: results[0].error });
}

async function handleSetComment(req, res) {
  const { bundleId, comment } = await parseJsonBody(req);
  const result = await KeyService.setComment(bundleId, comment);

  if (result.success) {
    sendJson(res, 200, { ok: true });
    return;
  }

  sendJson(res, 500, { error: result.error });
}

async function handleGetHistory(req, res) {
  const history = await KeyService.getHistory();
  sendJson(res, 200, history);
}

function getDefaultZones() {
  const fs = require('fs');
  const path = require('path');
  const dataFile = path.join(__dirname, '../../data.json');

  if (fs.existsSync(dataFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      if (data.zones && Array.isArray(data.zones)) {
        return data.zones;
      }
    } catch (error) {
      console.error('Error loading zones:', error);
    }
  }

  return [];
}

module.exports = {
  handleGetState,
  handleTakeKeys,
  handleReturnKeys,
  handleSetComment,
  handleGetHistory
};
