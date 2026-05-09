const AuthService = require('../services/AuthService');
const { parseJsonBody, sendJson } = require('../utils/http');

async function handleLogin(req, res) {
  const { name, password } = await parseJsonBody(req);
  const result = await AuthService.login(name, password);
  sendJson(res, 200, result);
}

async function handleWhoami(req, res) {
  const user = await AuthService.getCurrentUser(req);
  if (!user) {
    sendJson(res, 401, { error: 'Not authenticated' });
    return;
  }

  sendJson(res, 200, {
    id: user.id,
    name: user.name,
    role: user.role
  });
}

async function handleTryAutoLogin(req, res) {
  const { persistentToken } = await parseJsonBody(req);
  const result = await AuthService.tryAutoLogin(persistentToken);
  if (!result) {
    sendJson(res, 401, { error: 'Invalid or expired persistent token' });
    return;
  }
  sendJson(res, 200, result);
}

module.exports = {
  handleLogin,
  handleWhoami,
  handleTryAutoLogin
};
