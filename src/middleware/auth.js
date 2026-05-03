const jwt = require('jsonwebtoken');
const { sendJson } = require('../utils/http');

const JWT_SECRET = process.env.JWT_SECRET || 'keytracker-jwt-secret-2024';

// Extract JWT token from Authorization header
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  try {
    const { searchParams } = new URL(req.url, 'http://localhost');
    return searchParams.get('token');
  } catch (error) {
    return null;
  }
}

// Verify JWT token and return decoded payload
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

// Middleware to check JWT authentication
function authenticate(req, res) {
  const token = extractToken(req);
  if (!token) {
    sendJson(res, 401, { error: 'Authentication required' });
    return null;
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    sendJson(res, 401, { error: 'Invalid or expired token' });
    return null;
  }
  
  return decoded;
}

// Middleware to check user role
function checkRole(allowedRoles) {
  return (req, res) => {
    const user = authenticate(req, res);
    if (!user) return null;
    
    if (!allowedRoles.includes(user.role)) {
      sendJson(res, 403, { error: 'Access denied. Insufficient permissions.' });
      return null;
    }
    
    return user;
  };
}

module.exports = {
  authenticate,
  checkRole,
  sendJson,
  JWT_SECRET
};
