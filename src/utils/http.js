const { URL } = require('url');

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        error.statusCode = 400;
        error.exposeMessage = 'Invalid JSON body';
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

function requireAuth(authenticate, handler) {
  return async (req, res) => {
    const user = authenticate(req, res);
    if (!user) return;
    return handler(req, res, user);
  };
}

function requireRole(checkRole, roles, handler) {
  return async (req, res) => {
    const user = checkRole(roles)(req, res);
    if (!user) return;
    return handler(req, res, user);
  };
}

function withErrorHandling(handler) {
  return async (req, res, ...args) => {
    try {
      return await handler(req, res, ...args);
    } catch (error) {
      const status = error.statusCode || 500;
      if (status >= 500) {
        console.error('Route error:', error);
      }
      const payload = {
        error: error.exposeMessage || error.message || 'Internal server error'
      };
      sendJson(res, status, payload);
    }
  };
}

function getPathname(req) {
  return new URL(req.url, 'http://localhost').pathname;
}

module.exports = {
  getPathname,
  parseJsonBody,
  requireAuth,
  requireRole,
  sendJson,
  withErrorHandling
};
