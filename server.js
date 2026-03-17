const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

// Database file path - use Railway data directory if available
const dbPath = process.env.RAILWAY 
  ? '/data/keytracker.db'
  : path.join(ROOT, 'keytracker.db');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

// ----------------- SQLite Database (sql.js) -----------------
let db = null;
let SQL = null;

async function initDatabase() {
  const initSqlJs = require('sql.js');
  SQL = await initSqlJs();
  
  // Load existing database or create new one
  try {
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
      console.log('Loaded existing database:', dbPath);
    } else {
      db = new SQL.Database();
      console.log('Created new database');
    }
  } catch (e) {
    console.error('Error loading DB, creating new:', e);
    db = new SQL.Database();
  }
  
  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS zones (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      bundles TEXT NOT NULL DEFAULT '[]'
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS state (
      bundle_id TEXT PRIMARY KEY,
      person_name TEXT,
      taken_at INTEGER,
      comment TEXT DEFAULT ''
    )
  `);
  
  // Check if zones exist, if not - add default zones
  const result = db.exec('SELECT COUNT(*) as count FROM zones');
  const zoneCount = result.length > 0 ? result[0].values[0][0] : 0;
  
  if (zoneCount === 0) {
    const defaultZones = getDefaultZones();
    const stmt = db.prepare('INSERT INTO zones (id, name, bundles) VALUES (?, ?, ?)');
    defaultZones.forEach(z => {
      stmt.run([z.id, z.name, JSON.stringify(z.bundles)]);
    });
    stmt.free();
    saveDatabase();
  }
  
  console.log('SQLite database initialized:', dbPath);
}

function saveDatabase() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (e) {
    console.error('Error saving database:', e);
  }
}

// ----------------- Data helpers -----------------

function getDefaultZones() {
  return [
    { id: 'zone_1', name: 'Зона 1', bundles: ['101-1010', '101-105', '131-1311', '141-1410', '151-1510', '161-1611', '171-179', '181-1812', '191-1912'] },
    { id: 'zone_2', name: 'Зона 2', bundles: ['101-107', '111-116', '121-126', '131-136', '141-146', '151-156', '161-166', '171-180', '1101-1106', '1111-1113', '1121-1127', '1131-1138', '1141-1145'] },
    { id: 'zone_3', name: 'Зона 3', bundles: ['101-108', '111-119', '121-210', '131-140', '141-150', '151-159', '161-170', '171-180', '181-188'] },
    { id: 'zone_4', name: 'Зона 4', bundles: ['101-1010', '111-119', '121-1211', '131-1311', '131-1611', '141-1410', '151-1510', '161-169', '161-1611', '171-179', '181-1812', '191-1912', '191-1913'] },
    { id: 'zone_5', name: 'Зона 5', bundles: ['101-105', '111-114', '121-126', '131-136'] },
    { id: 'zone_6', name: 'Зона 6', bundles: ['101-106', '111-113', '121-125', '131-133'] },
    { id: 'zone_7', name: 'Зона 7', bundles: ['101-106', '111-116', '121-124', '131-135', '141-145', '151-154', '161-165', '171-172', '181-183'] },
    { id: 'zone_8', name: 'Зона 8', bundles: ['101-105', '111-115', '121-123', '131-136', '141-146'] },
    {
      id: 'zone_9',
      name: 'Зона 9',
      bundles: [
        '101-106', '111-115', '121-125', '131-134', '141-146',
        '151-156', '161-166', '171-175', '181-185',
        '201-204', '211-213', '221-228', '231-236',
        '241-246', '251-256', '261-266', '301-306', '311-314',
      ],
    },
    {
      id: 'zone_10',
      name: 'Зона 10',
      bundles: [
        '101-106', '107-110', '111-116', '121-125', '131-136', '141-143',
        '201-209', '211', '221-223', '231-234', '241-246',
        '251-256', '261-265', '271-274', '281-289',
        '301-304', '311-316', '321-326', '331-334',
        '341-346', '351-356', '361-366', '371-375', '381-382', '391-392',
      ],
    },
    {
      id: 'zone_11',
      name: 'Зона 11',
      bundles: [
        '111-116', '121-124', '131-134', '141-144', '151-155', '161-165',
        '211-215', '221-224', '231-236', '241-246',
        '251-255', '261-265', '271-275', '281-285', '291-293',
      ],
    },
    { id: 'zone_12', name: 'Зона 12', bundles: ['101-106', '111-116', '121-125', '131-134', '141-144', '151-156', '161-166'] },
    { id: 'zone_15', name: 'Зона 15', bundles: ['201-206', '211-216', '221-225', '301-306', '311-316', '321-326'] },
    { id: 'zone_17', name: 'Зона 17', bundles: ['101-106', '111-116', '121-126', '131-136', '141-146', '201-205'] },
    { id: 'zone_18', name: 'Зона 18', bundles: ['101-106', '111-116', '121-126', '131-136', '141-146', '151-154'] },
  ];
}

function getState() {
  const result = db.exec('SELECT bundle_id, person_name, taken_at, comment FROM state');
  const state = {};
  if (result.length > 0) {
    result[0].values.forEach(row => {
      const [bundle_id, person_name, taken_at, comment] = row;
      const entry = {};
      if (person_name) entry.personName = person_name;
      if (taken_at) entry.takenAt = taken_at;
      if (comment) entry.comment = comment;
      if (Object.keys(entry).length > 0) {
        state[bundle_id] = entry;
      }
    });
  }
  return state;
}

function getZones() {
  const result = db.exec('SELECT id, name, bundles FROM zones');
  if (result.length === 0) return [];
  return result[0].values.map(row => ({
    id: row[0],
    name: row[1],
    bundles: JSON.parse(row[2]),
  }));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

// ----------------- SSE clients -----------------
const sseClients = new Set();

function broadcastUpdate() {
  const data = {
    zones: getZones(),
    state: getState(),
  };
  const message = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    client.write(message);
  });
}

// ----------------- HTTP server -----------------

const server = http.createServer(async (req, res) => {
  // Wait for database to be ready
  if (!db) {
    res.writeHead(503, { 'Content-Type': 'text/plain' });
    res.end('Database not ready');
    return;
  }

  // API endpoints
  if (req.url.startsWith('/api/')) {
    const method = req.method || 'GET';

    // SSE endpoint for real-time updates
    if (req.url === '/api/events' && method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });
      res.write(':ok\n\n');
      sseClients.add(res);
      req.on('close', () => {
        sseClients.delete(res);
      });
      return;
    }

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === '/api/state' && method === 'GET') {
      const data = {
        zones: getZones(),
        state: getState(),
      };
      sendJson(res, 200, data);
      return;
    }

    if (req.url === '/api/take' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { bundleId, personName } = body;
        if (!bundleId || !personName || !String(personName).trim()) {
          sendJson(res, 400, { error: 'bundleId and personName are required' });
          return;
        }
        
        // Get existing comment if any
        const existingResult = db.exec('SELECT comment FROM state WHERE bundle_id = ?', [bundleId]);
        const existingComment = (existingResult.length > 0 && existingResult[0].values.length > 0) 
          ? existingResult[0].values[0][0] || '' 
          : '';
        
        // Insert or replace
        db.run('DELETE FROM state WHERE bundle_id = ?', [bundleId]);
        db.run('INSERT INTO state (bundle_id, person_name, taken_at, comment) VALUES (?, ?, ?, ?)', 
          [bundleId, String(personName).trim(), Date.now(), existingComment]);
        
        saveDatabase();
        broadcastUpdate();
        sendJson(res, 200, { ok: true });
      } catch (e) {
        console.error('Take error:', e);
        sendJson(res, 500, { error: 'Failed to take key' });
      }
      return;
    }

    if (req.url === '/api/return' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { bundleId } = body;
        if (!bundleId) {
          sendJson(res, 400, { error: 'bundleId is required' });
          return;
        }
        
        // Get existing comment before delete
        const existingResult = db.exec('SELECT comment FROM state WHERE bundle_id = ?', [bundleId]);
        const comment = (existingResult.length > 0 && existingResult[0].values.length > 0)
          ? existingResult[0].values[0][0] || ''
          : '';
        
        // If there's a comment, update row, otherwise delete
        if (comment) {
          db.run('UPDATE state SET person_name = NULL, taken_at = NULL WHERE bundle_id = ?', [bundleId]);
        } else {
          db.run('DELETE FROM state WHERE bundle_id = ?', [bundleId]);
        }
        
        saveDatabase();
        broadcastUpdate();
        sendJson(res, 200, { ok: true });
      } catch (e) {
        console.error('Return error:', e);
        sendJson(res, 500, { error: 'Failed to return key' });
      }
      return;
    }

    if (req.url === '/api/comment' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { bundleId, comment } = body;
        if (!bundleId) {
          sendJson(res, 400, { error: 'bundleId is required' });
          return;
        }
        
        const commentText = comment ? String(comment).trim() : '';
        const existingResult = db.exec('SELECT * FROM state WHERE bundle_id = ?', [bundleId]);
        
        if (existingResult.length > 0 && existingResult[0].values.length > 0) {
          db.run('UPDATE state SET comment = ? WHERE bundle_id = ?', [commentText, bundleId]);
        } else {
          db.run('INSERT INTO state (bundle_id, comment) VALUES (?, ?)', [bundleId, commentText]);
        }
        
        saveDatabase();
        broadcastUpdate();
        sendJson(res, 200, { ok: true });
      } catch (e) {
        console.error('Comment error:', e);
        sendJson(res, 500, { error: 'Failed to set comment' });
      }
      return;
    }

    if (req.url === '/api/add-zone' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const name = String(body.name || '').trim();
        if (!name) {
          sendJson(res, 400, { error: 'name is required' });
          return;
        }
        const id = 'zone_' + Date.now();
        db.run('INSERT INTO zones (id, name, bundles) VALUES (?, ?, ?)', [id, name, '[]']);
        saveDatabase();
        broadcastUpdate();
        sendJson(res, 200, { ok: true, id });
      } catch (e) {
        console.error('Add zone error:', e);
        sendJson(res, 500, { error: 'Failed to add zone' });
      }
      return;
    }

    if (req.url === '/api/add-bundle' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const zoneId = body.zoneId;
        const range = String(body.range || '').trim();
        if (!zoneId || !range) {
          sendJson(res, 400, { error: 'zoneId and range are required' });
          return;
        }
        
        const zoneResult = db.exec('SELECT bundles FROM zones WHERE id = ?', [zoneId]);
        if (zoneResult.length === 0 || zoneResult[0].values.length === 0) {
          sendJson(res, 404, { error: 'Zone not found' });
          return;
        }
        
        const bundles = JSON.parse(zoneResult[0].values[0][0]);
        if (!bundles.includes(range)) {
          bundles.push(range);
          bundles.sort((a, b) => String(a).localeCompare(b, 'uk', { numeric: true }));
          db.run('UPDATE zones SET bundles = ? WHERE id = ?', [JSON.stringify(bundles), zoneId]);
          saveDatabase();
          broadcastUpdate();
        }
        sendJson(res, 200, { ok: true });
      } catch (e) {
        console.error('Add bundle error:', e);
        sendJson(res, 500, { error: 'Failed to add bundle' });
      }
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
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

// Initialize database and start server
initDatabase().then(() => {
  server.listen(PORT, () => {
    console.log('');
    console.log('  Сайт запущено: http://localhost:' + PORT);
    console.log('  База данных: SQLite (' + dbPath + ')');
    console.log('  Зупинити: Ctrl+C');
    console.log('');
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
