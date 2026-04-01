const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// PostgreSQL connection
const { Pool } = require('pg');

let pool = null;

console.log('Starting server...');

// Check for PostgreSQL connection string
const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
console.log('DATABASE_URL:', DATABASE_URL ? 'set' : 'not set');
console.log('POSTGRES_URL:', process.env.POSTGRES_URL ? 'set' : 'not set');

if (DATABASE_URL) {
  console.log('Using PostgreSQL database');
  pool = new Pool({
    connectionString: DATABASE_URL,
  });
} else {
  console.log('No DATABASE_URL found, using in-memory storage');
  // Fallback to in-memory storage
  var memoryData = {
    zones: [],
    state: {},
    people: [],
    history: []
  };
  var memoryId = { people: 1, history: 1 };
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

// ----------------- Database Functions -----------------

async function initDatabase() {
  if (!pool) {
    console.log('Using in-memory storage');
    return;
  }
  
  try {
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS state (
        bundle_id TEXT PRIMARY KEY,
        person_name TEXT,
        taken_at BIGINT,
        comment TEXT DEFAULT ''
      )
    `);
    console.log('State table created');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS people (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        phone TEXT DEFAULT '',
        is_admin BOOLEAN DEFAULT FALSE
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS history (
        id SERIAL PRIMARY KEY,
        bundle_id TEXT NOT NULL,
        person_name TEXT,
        action TEXT NOT NULL,
        timestamp BIGINT NOT NULL
      )
    `);
    
    console.log('Database ready');
  } catch (e) {
    console.error('Failed to initialize database:', e);
    throw e;
  }
}

// Helper function to run queries
async function dbQuery(query, params = []) {
  if (pool) {
    const result = await pool.query(query, params);
    return result;
  } else {
    // In-memory fallback
    return { rows: [], rowCount: 0 };
  }
}

// State functions
function getState() {
  if (!pool) return memoryData.state;
  // Will be populated from DB
  return null;
}

async function getStateFromDB() {
  if (!pool) return memoryData.state;
  
  try {
    const result = await pool.query('SELECT * FROM state');
    const state = {};
    for (const row of result.rows) {
      state[row.bundle_id] = {
        personName: row.person_name,
        takenAt: row.taken_at ? Number(row.taken_at) : null,
        comment: row.comment
      };
    }
    return state;
  } catch (e) {
    console.error('Error getting state:', e);
    return {};
  }
}

async function setStateInDB(bundleId, data) {
  if (!pool) {
    memoryData.state[bundleId] = data;
    return;
  }
  
  try {
    await pool.query(
      `INSERT INTO state (bundle_id, person_name, taken_at, comment) 
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (bundle_id) DO UPDATE SET 
       person_name = EXCLUDED.person_name, 
       taken_at = EXCLUDED.taken_at,
       comment = EXCLUDED.comment`,
      [bundleId, data.personName, data.takenAt, data.comment || '']
    );
  } catch (e) {
    console.error('Error setting state:', e);
  }
}

async function deleteStateFromDB(bundleId) {
  if (!pool) {
    delete memoryData.state[bundleId];
    return;
  }
  
  try {
    await pool.query('DELETE FROM state WHERE bundle_id = $1', [bundleId]);
  } catch (e) {
    console.error('Error deleting state:', e);
  }
}

// People functions
async function getPeopleFromDB() {
  if (!pool) return memoryData.people;
  
  try {
    const result = await pool.query('SELECT * FROM people ORDER BY name');
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      isAdmin: row.is_admin || false
    }));
  } catch (e) {
    console.error('Error getting people:', e);
    return [];
  }
}

async function addPersonToDB(name, phone) {
  if (!pool) {
    const person = { id: memoryId.people++, name, phone, isAdmin: false };
    memoryData.people.push(person);
    return person;
  }
  
  try {
    const result = await pool.query(
      'INSERT INTO people (name, phone) VALUES ($1, $2) RETURNING *',
      [name, phone || '']
    );
    console.log('Person added to PostgreSQL:', name);
    return result.rows[0];
  } catch (e) {
    console.error('Error adding person:', e);
    throw e;
  }
}

async function updatePersonInDB(id, name, phone, isAdmin) {
  if (!pool) {
    const person = memoryData.people.find(p => p.id === id);
    if (person) {
      person.name = name;
      person.phone = phone;
      person.isAdmin = isAdmin || false;
    }
    return;
  }
  
  try {
    await pool.query(
      'UPDATE people SET name = $1, phone = $2, is_admin = $3 WHERE id = $4',
      [name, phone || '', isAdmin || false, id]
    );
  } catch (e) {
    console.error('Error updating person:', e);
    throw e;
  }
}

async function deletePersonFromDB(id) {
  if (!pool) {
    memoryData.people = memoryData.people.filter(p => p.id !== id);
    return;
  }
  
  try {
    await pool.query('DELETE FROM people WHERE id = $1', [id]);
  } catch (e) {
    console.error('Error deleting person:', e);
    throw e;
  }
}

// History functions
async function getHistoryFromDB() {
  if (!pool) return memoryData.history;
  
  try {
    const result = await pool.query('SELECT * FROM history ORDER BY timestamp DESC LIMIT 100');
    return result.rows.map(row => ({
      id: row.id,
      bundleId: row.bundle_id,
      personName: row.person_name,
      action: row.action,
      timestamp: Number(row.timestamp)
    }));
  } catch (e) {
    console.error('Error getting history:', e);
    return [];
  }
}

async function addHistoryToDB(bundleId, personName, action) {
  if (!pool) {
    const entry = { id: memoryId.history++, bundleId, personName, action, timestamp: Date.now() };
    memoryData.history.push(entry);
    return;
  }
  
  try {
    await pool.query(
      'INSERT INTO history (bundle_id, person_name, action, timestamp) VALUES ($1, $2, $3, $4)',
      [bundleId, personName, action, Date.now()]
    );
  } catch (e) {
    console.error('Error adding history:', e);
  }
}

// Zones are loaded from data.json
function getDefaultZones() {
  const dataFile = path.join(ROOT, 'data.json');
  if (fs.existsSync(dataFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
      if (data.zones && Array.isArray(data.zones)) {
        return data.zones;
      }
    } catch (e) {
      console.error('Error loading zones:', e);
    }
  }
  return [];
}

function getZones() {
  return getDefaultZones();
}

// ----------------- HTTP Server -----------------

const server = http.createServer(async (req, res) => {
  console.log('Request:', req.method, req.url);
  if (!pool && !memoryData) {
    res.writeHead(503, { 'Content-Type': 'text/plain' });
    res.end('Database not ready');
    return;
  }

  // API endpoints
  if (req.url.startsWith('/api/')) {
    const method = req.method || 'GET';

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Helper functions
    function sendJson(status, data) {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
    }

    async function parseBody(req) {
      return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch (e) {
            reject(e);
          }
        });
        req.on('error', reject);
      });
    }

    // State endpoint
    if (req.url === '/api/state' && method === 'GET') {
      try {
        const state = await getStateFromDB();
        sendJson(200, { zones: getZones(), state });
      } catch (e) {
        sendJson(500, { error: 'Failed to get state' });
      }
      return;
    }

    // Take keys
    if (req.url === '/api/take' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { bundleId, personName } = body;
        
        if (!bundleId || !personName || !String(personName).trim()) {
          sendJson(400, { error: 'Missing bundleId or personName' });
          return;
        }

        await setStateInDB(bundleId, {
          personName: String(personName).trim(),
          takenAt: Date.now(),
          comment: ''
        });
        await addHistoryToDB(bundleId, String(personName).trim(), 'take');
        
        console.log('Keys taken:', bundleId, personName);
        sendJson(200, { ok: true });
      } catch (e) {
        console.error('Take error:', e);
        sendJson(500, { error: 'Failed to take keys' });
      }
      return;
    }

    // Return keys
    if (req.url === '/api/return' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { bundleId } = body;
        
        const state = await getStateFromDB();
        const currentHolder = state[bundleId]?.personName;
        
        await deleteStateFromDB(bundleId);
        
        if (currentHolder) {
          await addHistoryToDB(bundleId, currentHolder, 'return');
        }
        
        console.log('Keys returned:', bundleId);
        sendJson(200, { ok: true });
      } catch (e) {
        console.error('Return error:', e);
        sendJson(500, { error: 'Failed to return keys' });
      }
      return;
    }

    // Comment
    if (req.url === '/api/comment' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { bundleId, comment } = body;
        
        const state = await getStateFromDB();
        const existing = state[bundleId];
        
        if (existing) {
          await setStateInDB(bundleId, {
            ...existing,
            comment: comment || ''
          });
        }
        
        sendJson(200, { ok: true });
      } catch (e) {
        sendJson(500, { error: 'Failed to set comment' });
      }
      return;
    }

    // People endpoints
    if (req.url === '/api/people' && method === 'GET') {
      try {
        const people = await getPeopleFromDB();
        sendJson(200, people);
      } catch (e) {
        sendJson(500, { error: 'Failed to get people' });
      }
      return;
    }

    if (req.url === '/api/people/add' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const trimmedName = String(body.name || '').trim();
        const trimmedPhone = String(body.phone || '').trim();
        
        if (!trimmedName) {
          sendJson(400, { error: 'Name is required' });
          return;
        }

        await addPersonToDB(trimmedName, trimmedPhone);
        console.log('Person added:', trimmedName);
        sendJson(200, { ok: true });
      } catch (e) {
        console.error('Add person error:', e);
        sendJson(500, { error: 'Failed to add person' });
      }
      return;
    }

    if (req.url === '/api/people/update' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { id, name, phone, isAdmin } = body;
        
        await updatePersonInDB(id, name, phone, isAdmin);
        sendJson(200, { ok: true });
      } catch (e) {
        sendJson(500, { error: 'Failed to update person' });
      }
      return;
    }

    if (req.url === '/api/people/delete' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { id } = body;
        
        await deletePersonFromDB(id);
        sendJson(200, { ok: true });
      } catch (e) {
        sendJson(500, { error: 'Failed to delete person' });
      }
      return;
    }

    // Set admin endpoint (requires secret key)
    if (req.url === '/api/set-admin' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { name, secret } = body;
        
        // Secret key from environment variable or default
        const ADMIN_SECRET = process.env.ADMIN_SECRET || 'keytracker-admin-2024';
        
        if (secret !== ADMIN_SECRET) {
          sendJson(403, { error: 'Invalid secret key' });
          return;
        }
        
        if (!name) {
          sendJson(400, { error: 'Name is required' });
          return;
        }
        
        // Find person and update is_admin
        if (pool) {
          await pool.query(
            'UPDATE people SET is_admin = true WHERE name = $1',
            [name]
          );
        } else {
          const person = memoryData.people.find(p => p.name === name);
          if (person) person.isAdmin = true;
        }
        
        console.log('Admin set for:', name);
        sendJson(200, { ok: true, message: name + ' теперь админ' });
      } catch (e) {
        sendJson(500, { error: 'Failed to set admin' });
      }
      return;
    }

    // History endpoint
    if (req.url === '/api/history' && method === 'GET') {
      try {
        const history = await getHistoryFromDB();
        sendJson(200, history);
      } catch (e) {
        sendJson(500, { error: 'Failed to get history' });
      }
      return;
    }

    sendJson(404, { error: 'Not found' });
    return;
  }

  // Static files
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(ROOT, path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, ''));

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }
      res.writeHead(500);
      res.end('Server Error');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// Start server
console.log('Starting server on port:', PORT);
initDatabase().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log('Server running on port ' + PORT);
  });
}).catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});