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

  const expectedVersion = (process.env.POSTGRES_EXPECTED_MIGRATION_VERSION || '').trim();
  if (!expectedVersion) {
    console.error('[db-smoke] failed');
    console.error('POSTGRES_EXPECTED_MIGRATION_VERSION is required for smoke:db');
    process.exit(1);
  }

  const host = process.env.SMOKE_SERVER_HOST || '127.0.0.1';
  const port = Number(process.env.SMOKE_SERVER_PORT || process.env.PORT || 3000);
  const endpoint = `http://${host}:${port}/healthz`;

  const response = await fetch(endpoint);
  const body = await response.json().catch(() => ({}));
  const postgres = body && typeof body === 'object' ? body.postgres : null;
  const migration = postgres && typeof postgres === 'object' ? postgres.migration : null;

  const valid = Boolean(
    response.ok &&
      body &&
      typeof body === 'object' &&
      body.status === 'ok' &&
      postgres &&
      typeof postgres === 'object' &&
      postgres.configured === true &&
      postgres.ok === true &&
      migration &&
      typeof migration === 'object' &&
      migration.ok === true &&
      migration.version === expectedVersion
  );

  if (!valid) {
    console.error('[db-smoke] failed');
    console.error(
      JSON.stringify(
        {
          status: response.status,
          expectedVersion,
          body
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  console.log('[db-smoke] passed');
  console.log(
    JSON.stringify(
      {
        status: response.status,
        postgresConfigured: postgres.configured,
        postgresOk: postgres.ok,
        migrationVersion: migration.version
      },
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error('[db-smoke] unexpected error');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
