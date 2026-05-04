const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../db/models/User');
const { JWT_SECRET } = require('../middleware/auth');

class AuthService {
  static async login(name, password) {
    if (!name || !String(name).trim()) {
      const error = new Error('Name is required');
      error.statusCode = 400;
      throw error;
    }
    
    if (!password) {
      const error = new Error('Password is required');
      error.statusCode = 400;
      throw error;
    }
    
    const trimmedName = String(name).trim();
    const person = await User.findByUsername(trimmedName);

    if (!person) {
      const error = new Error('User not found');
      error.statusCode = 401;
      throw error;
    }

    let passwordMatch = false;
    if (person.passwordHash && person.passwordHash.length > 0) {
      passwordMatch = await bcrypt.compare(password, person.passwordHash);
    }

    if (!passwordMatch && person.plainPassword) {
      passwordMatch = password === person.plainPassword;
    }
    
    if (!passwordMatch) {
      const error = new Error('Invalid password');
      error.statusCode = 401;
      throw error;
    }
    
    const token = jwt.sign(
      { 
        id: person.id, 
        name: person.name, 
        role: person.role || (person.isAdmin ? 'ADMIN' : 'USER'),
        source: person.source || 'users'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    return { 
      token, 
      user: { 
        id: person.id, 
        name: person.name, 
        role: person.role || (person.isAdmin ? 'ADMIN' : 'USER')
      } 
    };
  }

  static async verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return null;
    }
  }

  static extractToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  static async getCurrentUser(req) {
    const token = this.extractToken(req);
    if (!token) {
      return null;
    }
    
    const decoded = await this.verifyToken(token);
    if (!decoded) {
      return null;
    }
    
    return await User.findById(decoded.id, decoded.source);
  }

  static isAdmin(user) {
    return user && user.role === 'ADMIN';
  }
}

module.exports = AuthService;
