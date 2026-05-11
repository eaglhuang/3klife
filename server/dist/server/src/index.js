"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const crypto_js_1 = __importDefault(require("crypto-js"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pg_1 = require("pg");
function loadEnvFiles() {
    const envCandidates = [
        path_1.default.resolve(process.cwd(), '.env'),
        path_1.default.resolve(process.cwd(), '../.env')
    ];
    for (const envPath of envCandidates) {
        if (fs_1.default.existsSync(envPath)) {
            dotenv_1.default.config({ path: envPath, override: false });
        }
    }
}
loadEnvFiles();
const app = (0, express_1.default)();
const host = (_a = process.env.HOST) !== null && _a !== void 0 ? _a : '0.0.0.0';
const port = Number((_b = process.env.PORT) !== null && _b !== void 0 ? _b : 3000);
const postgresHost = (_c = process.env.POSTGRES_HOST) !== null && _c !== void 0 ? _c : '';
const postgresPort = Number((_d = process.env.POSTGRES_PORT) !== null && _d !== void 0 ? _d : 5432);
const postgresUser = (_e = process.env.POSTGRES_USER) !== null && _e !== void 0 ? _e : '';
const postgresPassword = (_f = process.env.POSTGRES_PASSWORD) !== null && _f !== void 0 ? _f : '';
const postgresDatabase = (_g = process.env.POSTGRES_DB) !== null && _g !== void 0 ? _g : '';
const expectedMigrationVersion = ((_h = process.env.POSTGRES_EXPECTED_MIGRATION_VERSION) !== null && _h !== void 0 ? _h : '').trim();
const requireMigrationVersion = ['1', 'true', 'yes'].includes(((_j = process.env.POSTGRES_REQUIRE_MIGRATION_VERSION) !== null && _j !== void 0 ? _j : '').trim().toLowerCase());
const migrationVersionQuery = (_k = process.env.POSTGRES_MIGRATION_VERSION_QUERY) !== null && _k !== void 0 ? _k : `
SELECT COALESCE(
    CASE
        WHEN to_regclass('public.schema_migrations') IS NOT NULL
            THEN (SELECT MAX(version)::text FROM public.schema_migrations)
    END,
    CASE
        WHEN to_regclass('public.knex_migrations') IS NOT NULL
            THEN (SELECT MAX(name)::text FROM public.knex_migrations)
    END,
    CASE
        WHEN to_regclass('public.flyway_schema_history') IS NOT NULL
            THEN (SELECT MAX(version)::text FROM public.flyway_schema_history WHERE success = true)
    END,
    'unversioned'
) AS version;
`.trim();
const postgresConfigured = Boolean(postgresHost && postgresUser && postgresDatabase);
const postgresPool = postgresConfigured
    ? new pg_1.Pool({
        host: postgresHost,
        port: postgresPort,
        user: postgresUser,
        password: postgresPassword,
        database: postgresDatabase
    })
    : null;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// 模擬伺服器端資料庫中的玩家數據快照
const mockDatabase = {
    'PLAYER_TEST_01': {
        Last_Sync_Hash: 'INIT_HASH',
        Session_Secret: 'MOCK_SECRET_KEY',
        Assets: { Gold: 1000, Exp: 0 }
    }
};
async function checkPostgresMigrationVersion(pool) {
    var _a;
    const startedAt = Date.now();
    try {
        const result = await pool.query(migrationVersionQuery);
        const rawVersion = (_a = result.rows[0]) === null || _a === void 0 ? void 0 : _a.version;
        const version = rawVersion && String(rawVersion).trim() ? String(rawVersion).trim() : 'unversioned';
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
    }
    catch (error) {
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
async function checkPostgresHealth() {
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
    }
    catch (error) {
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
app.get('/healthz', async (_req, res) => {
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
app.post('/sync', (req, res) => {
    const syncReq = req.body;
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
        const calculatedHash = crypto_js_1.default.HmacSHA256(dataToHash, secret).toString();
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
        }
        else if (record.Action === 'SHOP_BUY') {
            player.Assets.Gold -= (record.Payload.Cost || 0);
        }
        // 更新雜湊錨點進行下一筆比對
        currentHashAnchor = calculatedHash;
    }
    // 4. 同步成功：生成新的 Secret 以防重放攻擊 (Replay Attack Prevention)
    const newSecret = crypto_js_1.default.lib.WordArray.random(16).toString();
    player.Session_Secret = newSecret;
    player.Last_Sync_Hash = currentHashAnchor;
    const response = {
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
async function closePostgresPool(signal) {
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
