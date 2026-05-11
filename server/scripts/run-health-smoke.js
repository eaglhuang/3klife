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

async function run() {
  loadEnvFiles();

  const host = process.env.SMOKE_SERVER_HOST || '127.0.0.1';
  const port = Number(process.env.SMOKE_SERVER_PORT || process.env.PORT || 3000);
  const endpoint = `http://${host}:${port}/healthz`;

  const response = await fetch(endpoint);
  const body = await response.json().catch(() => ({}));

  const postgres = body && typeof body === 'object' ? body.postgres : null;
  const migration = postgres && typeof postgres === 'object' ? postgres.migration : null;

  const payloadValid = Boolean(
    body &&
      typeof body === 'object' &&
      body.status === 'ok' &&
      postgres &&
      typeof postgres === 'object' &&
      typeof postgres.ok === 'boolean' &&
      migration &&
      typeof migration === 'object' &&
      typeof migration.ok === 'boolean' &&
      typeof migration.version === 'string'
  );

  if (!response.ok || !payloadValid) {
    console.error('[health-smoke] failed');
    console.error(JSON.stringify({ status: response.status, body }, null, 2));
    process.exit(1);
  }

  console.log('[health-smoke] passed');
  console.log(
    JSON.stringify(
      {
        status: response.status,
        service: body.service,
        postgres: {
          configured: postgres.configured,
          ok: postgres.ok,
          migration: migration.version
        }
      },
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error('[health-smoke] unexpected error');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
