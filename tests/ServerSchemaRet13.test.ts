/**
 * ServerSchemaRet13 — 伺服端留存統計列（RET-13 / PROG-2-2110）
 *
 * 驗證重點：
 *   1. 合法列沒有問題；ID、四個計數、Last_Login 各自的錯誤
 *   2. Last_Login 超前伺服端時間 5 分鐘以上被擋
 *   3. 客端值組列：壞值歸 0
 *   4. 合併只增不減（舊裝置不會蓋掉進度）；不同玩家丟錯
 *   5. 記憶體表存讀往返、更新合併後再驗證
 *   6. DDL 欄位與列型別一致
 */
import { assert, TestSuite } from './TestRunner';
import {
    buildRetentionStatsRow,
    mergeRetentionStatsRows,
    RetentionStatsRow,
    retentionStatsValidator,
    validateRetentionStatsRow,
} from '../server/schema/ret13-retention-stats-row';
import { createMemoryTable } from '../server/schema/in-memory-table';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

function row(overrides: Partial<RetentionStatsRow> = {}): RetentionStatsRow {
    return {
        player_id: 'P_0001',
        total_illustrations: 12,
        legacy_count: 2,
        last_login: '2026-11-09T08:00:00Z',
        consecutive_days: 5,
        daily_news_count: 30,
        ...overrides,
    };
}

function fieldsInDdl(): string[] {
    const sql = fs.readFileSync(path.resolve(__dirname, '../server/schema/011_retention_stats.sql'), 'utf8') as string;
    const body = sql.slice(sql.indexOf('(') + 1, sql.lastIndexOf(')'));
    return body
        .split('\n')
        .map((line) => line.trim().split(/\s+/)[0])
        .filter((name) => /^[a-z_]+$/.test(name));
}

export function createServerSchemaRet13Suite(): TestSuite {
    const suite = new TestSuite('ServerSchemaRet13 (伺服端留存統計列 RET-13)');

    suite.test('合法列沒有任何問題（含全 0 的新玩家）', () => {
        assert.equals(0, validateRetentionStatsRow(row()).length);
        assert.equals(0, validateRetentionStatsRow(row({ total_illustrations: 0, legacy_count: 0, consecutive_days: 0, daily_news_count: 0 })).length);
    });

    suite.test('player_id 必須 1~32 字元', () => {
        assert.isTrue(validateRetentionStatsRow(row({ player_id: '' })).some((i) => i.path === 'player_id'));
        assert.isTrue(validateRetentionStatsRow(row({ player_id: 'x'.repeat(33) })).some((i) => i.path === 'player_id'));
        assert.equals(0, validateRetentionStatsRow(row({ player_id: 'x'.repeat(32) })).length);
    });

    suite.test('四個計數必須是 0 以上的整數（負數、小數、NaN 都擋）', () => {
        for (const key of ['total_illustrations', 'legacy_count', 'consecutive_days', 'daily_news_count'] as const) {
            for (const bad of [-1, 1.5, Number.NaN, 2147483648]) {
                const issues = validateRetentionStatsRow(row({ [key]: bad }));
                assert.isTrue(issues.some((i) => i.path === key), `${key}=${bad} 應被擋`);
            }
        }
    });

    suite.test('last_login 必須可解析；給伺服端時間時不可超前 5 分鐘以上', () => {
        assert.isTrue(validateRetentionStatsRow(row({ last_login: 'not-a-date' })).some((i) => i.path === 'last_login'));
        const now = Date.parse('2026-11-09T08:00:00Z');
        assert.equals(0, validateRetentionStatsRow(row({ last_login: '2026-11-09T08:05:00Z' }), now).length, '剛好 5 分鐘容許');
        assert.isTrue(validateRetentionStatsRow(row({ last_login: '2026-11-09T08:05:01Z' }), now).some((i) => i.path === 'last_login'));
    });

    suite.test('buildRetentionStatsRow：缺值與壞值歸 0，小數捨去', () => {
        const built = buildRetentionStatsRow({ playerId: 'P_9', lastLogin: '2026-11-09T08:00:00Z', totalIllustrations: 7.9, legacyCount: -3, consecutiveDays: Number.NaN });
        assert.equals(7, built.total_illustrations);
        assert.equals(0, built.legacy_count);
        assert.equals(0, built.consecutive_days);
        assert.equals(0, built.daily_news_count);
        assert.equals(0, validateRetentionStatsRow(built).length);
    });

    suite.test('合併：累計欄位取較大值（舊存檔不覆蓋進度），登入資訊取較新那筆', () => {
        const server = row({ total_illustrations: 12, legacy_count: 2, daily_news_count: 30, last_login: '2026-11-09T08:00:00Z', consecutive_days: 5 });
        const staleDevice = row({ total_illustrations: 9, legacy_count: 3, daily_news_count: 20, last_login: '2026-11-01T08:00:00Z', consecutive_days: 9 });
        const merged = mergeRetentionStatsRows(server, staleDevice);
        assert.equals(12, merged.total_illustrations);
        assert.equals(3, merged.legacy_count);
        assert.equals(30, merged.daily_news_count);
        assert.equals('2026-11-09T08:00:00Z', merged.last_login);
        assert.equals(5, merged.consecutive_days, '連續天數跟著較新的登入走');
        const fresh = mergeRetentionStatsRows(server, row({ last_login: '2026-11-10T08:00:00Z', consecutive_days: 6, total_illustrations: 13 }));
        assert.equals(6, fresh.consecutive_days);
        assert.equals(13, fresh.total_illustrations);
    });

    suite.test('合併：不同玩家丟錯', () => {
        let thrown = false;
        try { mergeRetentionStatsRows(row(), row({ player_id: 'P_0002' })); } catch { thrown = true; }
        assert.isTrue(thrown);
    });

    suite.test('記憶體表：存讀往返一致、主鍵重複擋、更新合併後再驗證', () => {
        const table = createMemoryTable<RetentionStatsRow>('player_retention_stats', (r) => r.player_id, retentionStatsValidator);
        table.insert(row());
        assert.equals(JSON.stringify(row()), JSON.stringify(table.get('P_0001')));
        let dup = false;
        try { table.insert(row()); } catch { dup = true; }
        assert.isTrue(dup, '主鍵重複要擋');
        table.update('P_0001', { legacy_count: 3 });
        assert.equals(3, table.get('P_0001')!.legacy_count);
        let invalid = false;
        try { table.update('P_0001', { daily_news_count: -1 }); } catch { invalid = true; }
        assert.isTrue(invalid, '更新後違規要擋');
        assert.equals(3, table.get('P_0001')!.legacy_count, '擋下後內容不變');
    });

    suite.test('DDL 欄位與列型別是同一組欄位名', () => {
        assert.equals(JSON.stringify(Object.keys(row())), JSON.stringify(fieldsInDdl()));
    });

    return suite;
}
