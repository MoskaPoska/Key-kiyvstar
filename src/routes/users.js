const UserService = require('../services/UserService');
const { parseJsonBody, sendJson } = require('../utils/http');

async function handleGetUsers(req, res) {
  const users = await UserService.getAll();
  sendJson(res, 200, users);
}

async function handleAddUser(req, res) {
  const { name, phone, isAdmin, password } = await parseJsonBody(req);
  const trimmedName = String(name || '').trim();
  const trimmedPhone = String(phone || '').trim();
  const isAdminValue = isAdmin === true;
  const passwordValue = password || null;

  if (!trimmedName) {
    sendJson(res, 400, { error: 'Name is required' });
    return;
  }

  const result = await UserService.create(trimmedName, trimmedPhone, isAdminValue, passwordValue);
  sendJson(res, 200, {
    ok: true,
    message: `Сотрудник создан. Роль: ${isAdminValue ? 'ADMIN' : 'USER'}`,
    user: result
  });
}

async function handleUpdateUser(req, res) {
  const { id, name, phone, isAdmin } = await parseJsonBody(req);
  const trimmedName = String(name || '').trim();
  const trimmedPhone = String(phone || '').trim();

  if (!trimmedName) {
    sendJson(res, 400, { error: 'Name is required' });
    return;
  }

  const result = await UserService.update(id, { name: trimmedName, phone: trimmedPhone, isAdmin: isAdmin === true });
  sendJson(res, 200, { ok: true, user: result });
}

async function handleDeleteUser(req, res) {
  const { id } = await parseJsonBody(req);
  await UserService.delete(id);
  sendJson(res, 200, { ok: true });
}

async function handleChangePassword(req, res) {
  const { id, newPassword } = await parseJsonBody(req);
  await UserService.changePassword(id, newPassword);
  sendJson(res, 200, { ok: true, message: 'Пароль изменен' });
}

module.exports = {
  handleGetUsers,
  handleAddUser,
  handleUpdateUser,
  handleDeleteUser,
  handleChangePassword
};
