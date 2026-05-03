const bcrypt = require('bcrypt');
const database = require('../database');

class User {
  constructor() {
    this.memoryUsers = new Map();
    this.nextId = 1;
    this.initialized = false;
  }

  createDuplicateNameError() {
    const error = new Error('Сотрудник с таким именем уже существует');
    error.statusCode = 409;
    error.exposeMessage = 'Сотрудник с таким именем уже существует';
    return error;
  }

  isDuplicateNameError(error) {
    return error && error.code === '23505' && error.constraint === 'users_name_key';
  }

  async initializeDefaults() {
    if (this.initialized || database.isPostgreSQL()) return;
    
    const bcrypt = require('bcrypt');
    const defaultUsers = [
      { name: 'Администратор', password: 'admin123', isAdmin: true },
      { name: 'Админ', password: 'admin123', isAdmin: true },
      { name: 'Обычный Пользователь', password: 'user123', isAdmin: false }
    ];

    for (const u of defaultUsers) {
      const id = this.nextId++;
      const passwordHash = await bcrypt.hash(u.password, 10);
      this.memoryUsers.set(id, {
        id,
        name: u.name,
        phone: '',
        isAdmin: u.isAdmin,
        role: u.isAdmin ? 'ADMIN' : 'USER',
        passwordHash: passwordHash
      });
    }
    this.initialized = true;
  }

  async createTable() {
    if (database.isPostgreSQL()) {
      const query = `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          phone TEXT,
          password_hash TEXT,
          is_admin BOOLEAN DEFAULT false,
          role TEXT DEFAULT 'USER'
        )
      `;
      await database.query(query);
      await this.ensureColumns();
    }
  }

  async ensureColumns() {
    if (database.isPostgreSQL()) {
      await database.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT');
      await database.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT');
      await database.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false');
      await database.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT \'USER\'');
    }
  }

  async addRoleColumn() {
    await this.ensureColumns();
  }

  async migrateRoles() {
    if (database.isPostgreSQL()) {
      try {
        await database.query('UPDATE users SET role = \'ADMIN\' WHERE is_admin = true');
        await database.query('UPDATE users SET role = \'USER\' WHERE is_admin = false OR is_admin IS NULL');
      } catch (error) {
        console.error('Error migrating roles:', error);
      }
    }
  }

  async create(name, phone, isAdmin = false, password = null) {
    if (!password || String(password).length < 4) {
      throw new Error('Password must be at least 4 characters');
    }

    if (database.isPostgreSQL()) {
      const passwordHash = await bcrypt.hash(password, 10);
      const query = `
        INSERT INTO users (name, phone, password_hash, is_admin, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      let result;
      try {
        result = await database.query(query, [
          name, phone, passwordHash, isAdmin, isAdmin ? 'ADMIN' : 'USER'
        ]);
      } catch (error) {
        if (this.isDuplicateNameError(error)) {
          throw this.createDuplicateNameError();
        }
        throw error;
      }
      
      return {
        id: result.rows[0].id,
        name: result.rows[0].name,
        phone: result.rows[0].phone,
        isAdmin: result.rows[0].is_admin,
        role: result.rows[0].role
      };
    } else {
      // In-memory storage
      const existingUser = await this.findByUsername(name);
      if (existingUser) {
        throw this.createDuplicateNameError();
      }

      const id = this.nextId++;
      const user = {
        id,
        name,
        phone,
        isAdmin,
        role: isAdmin ? 'ADMIN' : 'USER'
      };
      
      if (password) {
        user.passwordHash = await bcrypt.hash(password, 10);
      }
      
      this.memoryUsers.set(id, user);
      return user;
    }
  }

  async getAll() {
    if (database.isPostgreSQL()) {
      const query = 'SELECT * FROM users ORDER BY name';
      const result = await database.query(query);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        isAdmin: row.is_admin,
        role: row.role
      }));
    } else {
      // In-memory storage
      return Array.from(this.memoryUsers.values())
        .sort((a, b) => a.name.localeCompare(b.name));
    }
  }

  async update(id, data) {
    const userId = Number(id);

    if (database.isPostgreSQL()) {
      const query = `
        UPDATE users 
        SET name = $1, phone = $2, is_admin = $3, role = $4
        WHERE id = $5
        RETURNING *
      `;
      let result;
      try {
        result = await database.query(query, [
          data.name, data.phone, data.isAdmin, data.isAdmin ? 'ADMIN' : 'USER', userId
        ]);
      } catch (error) {
        if (this.isDuplicateNameError(error)) {
          throw this.createDuplicateNameError();
        }
        throw error;
      }
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      
      return {
        id: result.rows[0].id,
        name: result.rows[0].name,
        phone: result.rows[0].phone,
        isAdmin: result.rows[0].is_admin,
        role: result.rows[0].role
      };
    } else {
      // In-memory storage
      const user = this.memoryUsers.get(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const duplicateUser = await this.findByUsername(data.name);
      if (duplicateUser && duplicateUser.id !== userId) {
        throw this.createDuplicateNameError();
      }
      
      user.name = data.name || user.name;
      user.phone = data.phone || user.phone;
      user.isAdmin = data.isAdmin !== undefined ? data.isAdmin : user.isAdmin;
      user.role = user.isAdmin ? 'ADMIN' : 'USER';
      
      return user;
    }
  }

  async delete(id) {
    const userId = Number(id);
    if (database.isPostgreSQL()) {
      const query = 'DELETE FROM users WHERE id = $1';
      await database.query(query, [userId]);
    } else {
      this.memoryUsers.delete(userId);
    }
  }

  async changePassword(id, newPassword) {
    const userId = Number(id);
    if (!newPassword || String(newPassword).length < 4) {
      throw new Error('Password must be at least 4 characters');
    }

    if (database.isPostgreSQL()) {
      const passwordHash = await bcrypt.hash(newPassword, 10);
      const query = 'UPDATE users SET password_hash = $1 WHERE id = $2';
      await database.query(query, [passwordHash, userId]);
    } else {
      const user = this.memoryUsers.get(userId);
      if (user) {
        user.passwordHash = await bcrypt.hash(newPassword, 10);
      }
    }
  }

  async findByUsername(name) {
    // Lazy init if not initialized
    if (!this.initialized && !database.isPostgreSQL()) {
      await this.initializeDefaults();
    }

    if (database.isPostgreSQL()) {
      const query = 'SELECT * FROM users WHERE name = $1';
      const result = await database.query(query, [name]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        isAdmin: row.is_admin,
        role: row.role,
        passwordHash: row.password_hash
      };
    } else {
      // In-memory storage
      const searchName = name.toLowerCase().trim();
      for (const user of this.memoryUsers.values()) {
        const userName = user.name.toLowerCase().trim();
        if (userName === searchName) {
          return user;
        }
      }
      return null;
    }
  }

  async findById(id) {
    if (database.isPostgreSQL()) {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await database.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        isAdmin: row.is_admin,
        role: row.role,
        passwordHash: row.password_hash
      };
    } else {
      // In-memory storage
      return this.memoryUsers.get(id) || null;
    }
  }

  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  static async verifyPasswordStatic(password, hash) {
    return await bcrypt.compare(password, hash);
  }
}

// Export singleton instance
module.exports = new User();
