/**
 * ServerSchemaGov13 — 治理存檔 Server 列（GOV-13 / PROG-2-2111）
 *
 * 驗證重點：
 *   1. 本機 → 列 → 本機往返一致（含空紀錄）
 *   2. Territory_Level 1~5、Auto_Mode 布林、player_id 長度
 *   3. Season_Output_JSON：JSON 陣列、每筆五項資源非負、season 嚴格遞增
 *   4. 轉列時清理：非法筆丟棄、同季保留最後一筆、依季排序、等級夾範圍
 *   5. 壞列讀回丟錯；記憶體表存讀、更新後再驗證
 *   6. DDL 欄位與列型別一致
 */
import { assert, TestSuite } from './TestRunner';
import {
    GOV13_SEASON_OUTPUT_MAX_CHARS,
    GovernanceStateRow,
    governanceStateToRow,
    governanceStateValidator,
    LocalGovernanceState,
    normalizeSeasonOutputs,
    rowToGovernanceState,
    SeasonOutputEntry,
    validateGovernanceStateRow,
} from '../server/schema/gov13-governance-row';
import { createMemoryTable } from '../server/schema/in-memory-table';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

function entry(season: number, extra: Partial<SeasonOutputEntry> = {}): SeasonOutputEntry {
    return { season, food: 560, gold: 350, fame: 120, troops: 400, intel: 180, ...extra };
}

function row(overrides: Partial<GovernanceStateRow> = {}): GovernanceStateRow {
    return {
        player_id: 'P_0001',
        territory_level: 3,
        auto_mode: true,
        season_output_json: JSON.stringify([entry(1), entry(2)]),
        ...overrides,
    };
}

function fieldsInDdl(): string[] {
    const sql = fs.readFileSync(path.resolve(__dirname, '../server/schema/012_governance_state.sql'), 'utf8') as string;
    const body = sql.slice(sql.indexOf('(') + 1, sql.lastIndexOf(')'));
    return body
        .split('\n')
        .map((line) => line.trim().split(/\s+/)[0])
        .filter((name) => /^[a-z_]+$/.test(name));
}

export function createServerSchemaGov13Suite(): TestSuite {
    const suite = new TestSuite('ServerSchemaGov13 (治理存檔 Server 列 GOV-13)');

    suite.test('合法列沒有問題（含空紀錄與等級邊界 1、5）', () => {
        assert.equals(0, validateGovernanceStateRow(row()).length);
        assert.equals(0, validateGovernanceStateRow(row({ season_output_json: '[]', territory_level: 1, auto_mode: false })).length);
        assert.equals(0, validateGovernanceStateRow(row({ territory_level: 5 })).length);
    });

    suite.test('本機 → 列 → 本機往返一致', () => {
        const local: LocalGovernanceState = { territoryLevel: 4, autoMode: true, seasonOutputs: [entry(3), entry(4, { food: 0 })] };
        const back = rowToGovernanceState(governanceStateToRow('P_7', local));
        assert.equals(JSON.stringify(local), JSON.stringify(back));
        const empty = rowToGovernanceState(governanceStateToRow('P_7', { territoryLevel: 1, autoMode: false, seasonOutputs: [] }));
        assert.equals(0, empty.seasonOutputs.length);
    });

    suite.test('territory_level 必須是 1~5 整數；auto_mode 必須是布林；player_id 1~32 字元', () => {
        for (const bad of [0, 6, 2.5, Number.NaN]) {
            assert.isTrue(validateGovernanceStateRow(row({ territory_level: bad })).some((i) => i.path === 'territory_level'), `level=${bad}`);
        }
        assert.isTrue(validateGovernanceStateRow(row({ auto_mode: 1 as unknown as boolean })).some((i) => i.path === 'auto_mode'));
        assert.isTrue(validateGovernanceStateRow(row({ player_id: '' })).some((i) => i.path === 'player_id'));
        assert.isTrue(validateGovernanceStateRow(row({ player_id: 'x'.repeat(33) })).some((i) => i.path === 'player_id'));
    });

    suite.test('season_output_json：非 JSON、非陣列、超長、筆內欄位錯誤、season 不遞增都擋', () => {
        assert.isTrue(validateGovernanceStateRow(row({ season_output_json: '{oops' })).some((i) => i.path === 'season_output_json'));
        assert.isTrue(validateGovernanceStateRow(row({ season_output_json: '{}' })).some((i) => i.path === 'season_output_json'));
        assert.isTrue(validateGovernanceStateRow(row({ season_output_json: ' '.repeat(GOV13_SEASON_OUTPUT_MAX_CHARS + 1) })).some((i) => i.path === 'season_output_json'));
        const negative = validateGovernanceStateRow(row({ season_output_json: JSON.stringify([entry(1, { gold: -1 })]) }));
        assert.isTrue(negative.some((i) => i.path === 'season_output_json[0].gold'));
        const dup = validateGovernanceStateRow(row({ season_output_json: JSON.stringify([entry(2), entry(2)]) }));
        assert.isTrue(dup.some((i) => i.path === 'season_output_json[1].season'));
        const back = validateGovernanceStateRow(row({ season_output_json: JSON.stringify([entry(3), entry(2)]) }));
        assert.isTrue(back.some((i) => i.path === 'season_output_json[1].season'));
        const notObj = validateGovernanceStateRow(row({ season_output_json: '[1]' }));
        assert.isTrue(notObj.some((i) => i.path === 'season_output_json[0]'));
    });

    suite.test('轉列清理：非法筆丟棄、同季保留最後一筆、依季排序、等級夾到 1~5', () => {
        const messy = [entry(5), entry(2), entry(2, { food: 999 }), entry(-1), entry(3, { intel: Number.NaN }), entry(1.5)];
        const cleaned = normalizeSeasonOutputs(messy);
        assert.equals(JSON.stringify([2, 5]), JSON.stringify(cleaned.map((e) => e.season)));
        assert.equals(999, cleaned[0].food, '同季保留最後一筆');
        assert.equals(5, governanceStateToRow('P', { territoryLevel: 99, autoMode: true, seasonOutputs: [] }).territory_level);
        assert.equals(1, governanceStateToRow('P', { territoryLevel: -3, autoMode: true, seasonOutputs: [] }).territory_level);
        assert.equals(1, governanceStateToRow('P', { territoryLevel: Number.NaN, autoMode: true, seasonOutputs: [] }).territory_level);
        assert.equals(0, validateGovernanceStateRow(governanceStateToRow('P', { territoryLevel: 2, autoMode: false, seasonOutputs: messy })).length);
    });

    suite.test('壞列讀回本機會丟錯', () => {
        let thrown = false;
        try { rowToGovernanceState(row({ territory_level: 9 })); } catch { thrown = true; }
        assert.isTrue(thrown);
    });

    suite.test('記憶體表：存讀往返、主鍵重複擋、更新後違規擋且內容不變', () => {
        const table = createMemoryTable<GovernanceStateRow>('player_governance_state', (r) => r.player_id, governanceStateValidator);
        table.insert(row());
        assert.equals(JSON.stringify(row()), JSON.stringify(table.get('P_0001')));
        let dup = false;
        try { table.insert(row()); } catch { dup = true; }
        assert.isTrue(dup);
        table.update('P_0001', { auto_mode: false });
        assert.isFalse(table.get('P_0001')!.auto_mode);
        let invalid = false;
        try { table.update('P_0001', { territory_level: 6 }); } catch { invalid = true; }
        assert.isTrue(invalid);
        assert.equals(3, table.get('P_0001')!.territory_level);
    });

    suite.test('DDL 欄位與列型別是同一組欄位名', () => {
        assert.equals(JSON.stringify(Object.keys(row())), JSON.stringify(fieldsInDdl()));
    });

    return suite;
}
