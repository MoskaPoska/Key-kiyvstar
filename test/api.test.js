const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, stopServer } = require('../src/server');
const User = require('../src/db/models/User');

let server;
let baseUrl;
let adminToken;
let userToken;
const runSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const adminName = `Admin Test ${runSuffix}`;
const userName = `User Test ${runSuffix}`;

async function jsonRequest(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { response, data };
}

async function login(name, password) {
  const { response, data } = await jsonRequest('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password })
  });

  assert.equal(response.status, 200);
  return data.token;
}

test.before(async () => {
  server = await startServer(0);
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;

  await User.create(adminName, '', true, 'admin-pass');
  await User.create(userName, '', false, 'user-pass');

  adminToken = await login(adminName, 'admin-pass');
  userToken = await login(userName, 'user-pass');
});

test.after(async () => {
  await stopServer(server);
});

test('login success and failure', async () => {
  const ok = await jsonRequest('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: adminName, password: 'admin-pass' })
  });
  assert.equal(ok.response.status, 200);
  assert.equal(ok.data.user.role, 'ADMIN');

  const fail = await jsonRequest('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: adminName, password: 'wrong-pass' })
  });
  assert.equal(fail.response.status, 401);
});

test('take and return keys', async () => {
  const take = await jsonRequest('/api/take', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`
    },
    body: JSON.stringify({ bundleId: 'zone_1_999-9999', personName: userName })
  });
  assert.equal(take.response.status, 200);

  const state = await jsonRequest('/api/state', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert.equal(state.response.status, 200);
  assert.equal(state.data.state['zone_1_999-9999'].personName, userName);

  const giveBack = await jsonRequest('/api/return', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`
    },
    body: JSON.stringify({ bundleId: 'zone_1_999-9999' })
  });
  assert.equal(giveBack.response.status, 200);
});

test('admin-only endpoints reject regular users', async () => {
  const forbidden = await jsonRequest('/api/people/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`
    },
    body: JSON.stringify({ name: 'Should Fail', phone: '', isAdmin: false, password: '1234' })
  });

  assert.equal(forbidden.response.status, 403);
});

test('create update delete user', async () => {
  const created = await jsonRequest('/api/people/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ name: 'CRUD User', phone: '123', isAdmin: false, password: '1234' })
  });
  assert.equal(created.response.status, 200);
  const userId = created.data.user.id;

  const updated = await jsonRequest('/api/people/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ id: userId, name: 'CRUD User Updated', phone: '456', isAdmin: true })
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.data.user.role, 'ADMIN');

  const deleted = await jsonRequest('/api/people/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ id: userId })
  });
  assert.equal(deleted.response.status, 200);
});

test('duplicate user name returns 409', async () => {
  const duplicate = await jsonRequest('/api/people/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ name: adminName, phone: '', isAdmin: false, password: '1234' })
  });

  assert.equal(duplicate.response.status, 409);
  assert.equal(duplicate.data.error, 'Сотрудник с таким именем уже существует');
});

test('zone access persistence', async () => {
  const payload = {
    7: [
      {
        address: 'Test street 10',
        code: '2580',
        tkdEntries: [{ entrance: '1', tkd: '7_1001', place: 'Hall' }]
      }
    ]
  };

  const saved = await jsonRequest('/api/zone-access', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify(payload)
  });
  assert.equal(saved.response.status, 200);

  const loaded = await jsonRequest('/api/zone-access', {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert.equal(loaded.response.status, 200);
  assert.deepEqual(loaded.data, payload);
});

test('voice parse requires authentication', async () => {
  const result = await jsonRequest('/api/voice/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript: 'Парковая 107 код 2580' })
  });

  assert.equal(result.response.status, 401);
});

test('voice parse uses AI service response', async () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-openai-key';

  global.fetch = async (url, options = {}) => {
    if (String(url).includes('/api/')) {
      return originalFetch(url, options);
    }

    assert.equal(url, 'https://api.openai.com/v1/responses');
    const payload = JSON.parse(options.body);
    assert.equal(payload.input, 'Парковая сто семь код две тысячи пятьсот восемьдесят');

    return {
      ok: true,
      async json() {
        return {
          output: [
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    zone: '',
                    address: 'Парковая, 107',
                    code: '2580',
                    confidence: 91
                  })
                }
              ]
            }
          ]
        };
      }
    };
  };

  try {
    const result = await jsonRequest('/api/voice/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({ transcript: 'Парковая сто семь код две тысячи пятьсот восемьдесят' })
    });

    assert.equal(result.response.status, 200);
    assert.deepEqual(result.data, {
      zone: '',
      address: 'Парковая, 107',
      code: '2580',
      confidence: 91
    });
  } finally {
    global.fetch = originalFetch;
    process.env.OPENAI_API_KEY = originalApiKey;
  }
});
