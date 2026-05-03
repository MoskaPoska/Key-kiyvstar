const User = require('../db/models/User');

class UserService {
  static async getAll() {
    return await User.getAll();
  }

  static async create(name, phone, isAdmin = false, password = null) {
    return await User.create(name, phone, isAdmin, password);
  }

  static async update(id, data) {
    return await User.update(id, data);
  }

  static async delete(id) {
    return await User.delete(id);
  }

  static async changePassword(id, newPassword) {
    return await User.changePassword(id, newPassword);
  }

  static async findByUsername(name) {
    return await User.findByUsername(name);
  }

  static async findById(id) {
    return await User.findById(id);
  }

  static isAdmin(user) {
    return user && user.role === 'ADMIN';
  }

  static canManageUsers(currentUser) {
    return this.isAdmin(currentUser);
  }

  static canTakeKeys(user) {
    return user && user.role !== null;
  }

  static canReturnKeys(user) {
    return user && user.role !== null;
  }

  static canSetComments(user) {
    return this.isAdmin(user);
  }
}

module.exports = UserService;
