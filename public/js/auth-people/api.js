(function () {
  'use strict';

  function create(config) {
    const { apiFetch, baseUrl = '' } = config;

    function fetchJson(path, options) {
      return apiFetch(baseUrl + path, options);
    }

    return {
      async login(name, password) {
        const res = await fetchJson('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, password }),
        });
        const data = await res.json();
        return { ok: res.ok, status: res.status, data };
      },

      async whoami() {
        return fetchJson('/api/whoami');
      },

      async getPeople() {
        return fetchJson('/api/people');
      },

      async addPerson(name, phone, isAdmin, password) {
        const res = await fetchJson('/api/people/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, isAdmin, password }),
        });
        const data = await res.json();
        return { ok: res.ok, status: res.status, data };
      },

      async updatePerson(id, name, phone, isAdmin) {
        const res = await fetchJson('/api/people/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, name, phone, isAdmin }),
        });
        const data = await res.json();
        return { ok: res.ok, status: res.status, data };
      },

      async deletePerson(id) {
        const res = await fetchJson('/api/people/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        const data = await res.json();
        return { ok: res.ok, status: res.status, data };
      },

      async changePassword(id, newPassword) {
        const res = await fetchJson('/api/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, newPassword }),
        });
        const data = await res.json();
        return { ok: res.ok, status: res.status, data };
      },
    };
  }

  window.AuthPeopleApi = {
    create,
  };
})();
