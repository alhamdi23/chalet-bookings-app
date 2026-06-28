// Local mock of the Google Apps Script sync backend.
// Dependency-free Node HTTP server that implements the SAME contract as
// apps-script/Code.gs, so you can fully test the app's sync without deploying
// anything to Google. Data is stored in mock-server/mock-data.json.
//
// Run:  npm run mock
// Then in the app's Settings:
//   - Apps Script Web App URL: http://localhost:8787
//   - Shared Token:            local-test-token   (or set MOCK_TOKEN env var)
//
// This is for LOCAL TESTING ONLY. The real backend is apps-script/Code.gs.

import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, 'mock-data.json');
const PORT = Number(process.env.MOCK_PORT) || 8787;
const TOKEN = process.env.MOCK_TOKEN || 'local-test-token';

const COLLECTIONS = ['bookings', 'operationCosts', 'costTypes'];

function loadData() {
  if (!existsSync(DATA_FILE)) {
    return { bookings: [], operationCosts: [], costTypes: [] };
  }
  try {
    const parsed = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
    return {
      bookings: parsed.bookings || [],
      operationCosts: parsed.operationCosts || [],
      costTypes: parsed.costTypes || [],
    };
  } catch {
    return { bookings: [], operationCosts: [], costTypes: [] };
  }
}

function saveData(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Last-write-wins merge by updatedAt (same logic as the Apps Script).
function mergeCollection(existing, incoming) {
  const byId = new Map();
  for (const item of existing) {
    byId.set(item.id, item);
  }
  for (const item of incoming) {
    if (!item || !item.id) {
      continue;
    }
    const prev = byId.get(item.id);
    if (!prev || String(item.updatedAt) > String(prev.updatedAt)) {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values());
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

const server = createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET') {
    const token = url.searchParams.get('token');
    if (token !== TOKEN) {
      sendJson(res, 200, { error: 'Invalid token' });
      return;
    }
    const data = loadData();
    const counts = COLLECTIONS.map((key) => `${key}=${data[key].length}`).join(', ');
    console.log(`GET  pull -> ${counts}`);
    sendJson(res, 200, data);
    return;
  }

  if (req.method === 'POST') {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        sendJson(res, 200, { error: 'Invalid JSON body' });
        return;
      }
      if (!body || body.token !== TOKEN) {
        sendJson(res, 200, { error: 'Invalid token' });
        return;
      }
      const data = loadData();
      for (const key of COLLECTIONS) {
        if (Array.isArray(body[key])) {
          data[key] = mergeCollection(data[key], body[key]);
        }
      }
      saveData(data);
      const counts = COLLECTIONS.map((key) => `${key}=${data[key].length}`).join(', ');
      console.log(`POST push -> ${counts} (saved to mock-data.json)`);
      sendJson(res, 200, { ok: true });
      return;
    });
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log('Mock sync server (Google Apps Script stand-in) running.');
  console.log(`  URL:   http://localhost:${PORT}`);
  console.log(`  Token: ${TOKEN}`);
  console.log(`  Data:  ${DATA_FILE}`);
  console.log('Enter the URL and token in the app Settings, then press "Sync Now".');
});
