#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnvFiles() {
  const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '../.env')
  ];

  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
    }
  }
}

function readFixture(fixturePath) {
  const payload = fs.readFileSync(fixturePath, 'utf8');
  return JSON.parse(payload);
}

async function run() {
  loadEnvFiles();

  const fixturePath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(process.cwd(), 'smoke-fixtures/sync-request.valid.json');

  const host = process.env.SMOKE_SERVER_HOST || '127.0.0.1';
  const port = Number(process.env.SMOKE_SERVER_PORT || process.env.PORT || 3000);
  const endpoint = `http://${host}:${port}/sync`;
  const fixture = readFixture(fixturePath);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fixture)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.Success !== true) {
    console.error('[sync-smoke] failed');
    console.error(JSON.stringify({ status: response.status, body: data }, null, 2));
    process.exit(1);
  }

  console.log('[sync-smoke] passed');
  console.log(JSON.stringify({
    status: response.status,
    newHash: data.New_Hash,
    hasNewSecret: Boolean(data.New_Session_Secret)
  }, null, 2));
}

run().catch((error) => {
  console.error('[sync-smoke] unexpected error');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
