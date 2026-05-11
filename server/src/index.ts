import express, { Request, Response } from 'express';
import cors from 'cors';
import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

import { ActionRecord, SyncRequest, SyncResponse } from '../../shared/protocols';

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
app.use(express.json());

// 模擬伺服器端資料庫中的玩家數據快照
const mockDatabase: { [key: string]: any } = {
    'PLAYER_TEST_01': {
        Last_Sync_Hash: 'INIT_HASH',
        Session_Secret: 'MOCK_SECRET_KEY',
        Assets: { Gold: 1000, Exp: 0 }
    }
};

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

/**
 * 核心同步驗證 API (防篡改驗證與邏輯重演)
 * Endpoint: POST /sync
 */
app.post('/sync', (req: Request, res: Response) => {
    const syncReq: SyncRequest = req.body;
    const player = mockDatabase[syncReq.Player_ID];

    if (!player) {
        return res.status(404).json({ Success: false, Message: 'Player not found.' });
    }

    // 1. 驗證金鑰
    if (syncReq.Session_Secret !== player.Session_Secret) {
        return res.status(403).json({ Success: false, Message: 'Invalid Session Secret (Security Breach).' });
    }

    // 2. 雜湊鏈重演與防篡改檢查 (Rolling Hash Verification)
    let currentHashAnchor = syncReq.Previous_Hash;
    const secret = player.Session_Secret;

    for (const record of syncReq.Action_Records) {
        // HMAC-SHA256 驗證公式: SHA256 (Action + Payload + Secret + PreviousHash)
        const payloadStr = JSON.stringify(record.Payload);
        const dataToHash = `${record.Action}${payloadStr}${secret}${currentHashAnchor}`;
        const calculatedHash = CryptoJS.HmacSHA256(dataToHash, secret).toString();

        if (calculatedHash !== record.Tx_Hash) {
            console.error(`[Server] Security Violation at Sequence #${record.Seq}! Hash Mismatch.`);
            return res.status(400).json({ 
                Success: false, 
                Message: `Hash chain broken at Seq #${record.Seq}. Sync rejected.` 
            });
        }
        
        console.log(`[Server] Verified Action Seq #${record.Seq}: ${record.Action} -> OK.`);

        // 3. 邏輯重演 (Business Logic Replay - 此處為簡易範例)
        if (record.Action === 'BATTLE_WIN') {
            player.Assets.Gold += (record.Payload.Gold || 0);
        } else if (record.Action === 'SHOP_BUY') {
            player.Assets.Gold -= (record.Payload.Cost || 0);
        }

        // 更新雜湊錨點進行下一筆比對
        currentHashAnchor = calculatedHash;
    }

    // 4. 同步成功：生成新的 Secret 以防重放攻擊 (Replay Attack Prevention)
    const newSecret = CryptoJS.lib.WordArray.random(16).toString();
    player.Session_Secret = newSecret;
    player.Last_Sync_Hash = currentHashAnchor;

    const response: SyncResponse = {
        Success: true,
        New_Session_Secret: newSecret,
        New_Hash: currentHashAnchor,
        Server_Time: Date.now()
    };

    console.log(`[Server] Sync success for ${syncReq.Player_ID}. New Gold: ${player.Assets.Gold}`);
    res.json(response);
});

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
