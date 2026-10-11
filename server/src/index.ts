import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

import { createDefaultPlayerStore, registerSyncRoutes } from './sync';

function loadEnvFiles(): void {
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

loadEnvFiles();

const app = express();
const host = process.env.HOST ?? '0.0.0.0';
const port = Number(process.env.PORT ?? 3000);
const postgresHost = process.env.POSTGRES_HOST ?? '';
const postgresPort = Number(process.env.POSTGRES_PORT ?? 5432);
const postgresUser = process.env.POSTGRES_USER ?? '';
const postgresPassword = process.env.POSTGRES_PASSWORD ?? '';
const postgresDatabase = process.env.POSTGRES_DB ?? '';
const expectedMigrationVersion = (process.env.POSTGRES_EXPECTED_MIGRATION_VERSION ?? '').trim();
const requireMigrationVersion = ['1', 'true', 'yes'].includes(
    (process.env.POSTGRES_REQUIRE_MIGRATION_VERSION ?? '').trim().toLowerCase()
);
const customMigrationVersionQuery = (process.env.POSTGRES_MIGRATION_VERSION_QUERY ?? '').trim();
const migrationVersionProbes = [
    {
        tableName: 'public.schema_migrations',
        query: 'SELECT MAX(version)::text AS version FROM public.schema_migrations;'
    },
    {
        tableName: 'public.knex_migrations',
        query: 'SELECT MAX(name)::text AS version FROM public.knex_migrations;'
    },
    {
        tableName: 'public.flyway_schema_history',
        query: 'SELECT MAX(version)::text AS version FROM public.flyway_schema_history WHERE success = true;'
    }
] as const;
const postgresConfigured = Boolean(postgresHost && postgresUser && postgresDatabase);
const postgresPool = postgresConfigured
    ? new Pool({
        host: postgresHost,
        port: postgresPort,
        user: postgresUser,
        password: postgresPassword,
        database: postgresDatabase
    })
    : null;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// 模擬伺服器端資料庫中的玩家數據快照（同步路由見 ./sync.ts）
const mockDatabase = createDefaultPlayerStore();

type PostgresHealth = {
    configured: boolean;
    ok: boolean;
    latencyMs: number | null;
    message: string;
    migration: PostgresMigrationStatus;
};

type PostgresMigrationStatus = {
    configured: boolean;
    ok: boolean;
    version: string;
    expectedVersion: string | null;
    latencyMs: number | null;
    message: string;
};

function normalizeMigrationVersion(rawVersion: string | null | undefined): string {
    return rawVersion && String(rawVersion).trim() ? String(rawVersion).trim() : 'unversioned';
}

function isMissingRelationError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const relationMissingCode = (error as { code?: string }).code;
    if (relationMissingCode === '42P01') {
        return true;
    }

    const message = error instanceof Error ? error.message : String(error);
    return message.includes('relation') && message.includes('does not exist');
}

async function resolveMigrationVersion(pool: Pool): Promise<string> {
    if (customMigrationVersionQuery) {
        try {
            const customResult = await pool.query<{ version: string | null }>(customMigrationVersionQuery);
            return normalizeMigrationVersion(customResult.rows[0]?.version);
        } catch (error) {
            if (isMissingRelationError(error)) {
                return 'unversioned';
            }
            throw error;
        }
    }

    for (const probe of migrationVersionProbes) {
        try {
            const result = await pool.query<{ version: string | null }>(probe.query);
            const version = normalizeMigrationVersion(result.rows[0]?.version);
            if (version !== 'unversioned') {
                return version;
            }
        } catch (error) {
            // 某些 migration 表可能尚未建立；缺表時改回 unversioned，不中斷 healthcheck。
            if (isMissingRelationError(error)) {
                continue;
            }
            throw error;
        }
    }

    return 'unversioned';
}

async function checkPostgresMigrationVersion(pool: Pool): Promise<PostgresMigrationStatus> {
    const startedAt = Date.now();
    try {
        const version = await resolveMigrationVersion(pool);
        const expectedVersion = expectedMigrationVersion || null;

        if (expectedVersion && version !== expectedVersion) {
            return {
                configured: true,
                ok: false,
                version,
                expectedVersion,
                latencyMs: Date.now() - startedAt,
                message: `version-mismatch:${version}`
            };
        }

        if (requireMigrationVersion && version === 'unversioned') {
            return {
                configured: true,
                ok: false,
                version,
                expectedVersion,
                latencyMs: Date.now() - startedAt,
                message: 'migration-version-missing'
            };
        }

        return {
            configured: true,
            ok: true,
            version,
            expectedVersion,
            latencyMs: Date.now() - startedAt,
            message: version === 'unversioned' ? 'unversioned' : 'ok'
        };
    } catch (error) {
        return {
            configured: true,
            ok: false,
            version: 'unknown',
            expectedVersion: expectedMigrationVersion || null,
            latencyMs: Date.now() - startedAt,
            message: error instanceof Error ? error.message : String(error)
        };
    }
}

async function checkPostgresHealth(): Promise<PostgresHealth> {
    if (!postgresPool) {
        return {
            configured: false,
            ok: true,
            latencyMs: null,
            message: 'not-configured',
            migration: {
                configured: false,
                ok: true,
                version: 'not-configured',
                expectedVersion: expectedMigrationVersion || null,
                latencyMs: null,
                message: 'not-configured'
            }
        };
    }

    const startedAt = Date.now();
    try {
        await postgresPool.query('SELECT 1');
        const migration = await checkPostgresMigrationVersion(postgresPool);
        return {
            configured: true,
            ok: migration.ok,
            latencyMs: Date.now() - startedAt,
            message: migration.ok ? 'connected' : 'connected-with-migration-warning',
            migration
        };
    } catch (error) {
        return {
            configured: true,
            ok: false,
            latencyMs: Date.now() - startedAt,
            message: error instanceof Error ? error.message : String(error),
            migration: {
                configured: true,
                ok: false,
                version: 'unknown',
                expectedVersion: expectedMigrationVersion || null,
                latencyMs: null,
                message: 'postgres-unreachable'
            }
        };
    }
}

app.get('/healthz', async (_req: Request, res: Response) => {
    const postgres = await checkPostgresHealth();
    const healthy = postgres.ok;
    res.status(healthy ? 200 : 503).json({
        status: healthy ? 'ok' : 'degraded',
        service: 'game-server-prototype',
        host,
        port,
        players: Object.keys(mockDatabase).length,
        postgres,
        serverTime: Date.now()
    });
});

registerSyncRoutes(app, mockDatabase);

app.listen(port, host, () => {
    console.log(`Game Server Simulation running at http://${host}:${port}`);
});

async function closePostgresPool(signal: string): Promise<void> {
    if (postgresPool) {
        await postgresPool.end();
    }
    console.log(`[Server] Received ${signal}, shutdown complete.`);
    process.exit(0);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
        void closePostgresPool(signal);
    });
}
