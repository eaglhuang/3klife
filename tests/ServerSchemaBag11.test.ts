/**
 * ServerSchemaBag11 — 伺服器裝備記錄列（BAG-11 / PROG-2-1395）
 *
 * 驗證重點：
 *   1. 合法列（武將裝備、倉庫）沒有任何問題
 *   2. slot_type 必為八種代碼之一
 *   3. general_uid NULL 與 WAREHOUSE 必須一致
 *   4. ID 長度、數量為正整數、is_locked 為布林、acquired_at 可解析
 *   5. DDL 欄位與列型別一致（同一組欄位名）
 */
import { assert, TestSuite } from './TestRunner';
import {
    GEAR_SLOT_TYPES,
    GearEquipRecordRow,
    validateGearEquipRecordRow,
} from '../server/schema/bag11-equip-row';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

function row(overrides: Partial<GearEquipRecordRow> = {}): GearEquipRecordRow {
    return {
        equip_id: 'E_0001',
        player_id: 'P_0001',
        general_uid: 'G501',
        item_id: 'GEAR_WEAPON_01',
        slot_type: 'WEAPON',
        count: 1,
        is_locked: false,
        acquired_at: '2026-10-28T12:00:00Z',
        ...overrides,
    };
}

function fieldsInDdl(): string[] {
    const sql = fs.readFileSync(path.resolve(__dirname, '../server/schema/010_gear_equip_records.sql'), 'utf8') as string;
    const body = sql.slice(sql.indexOf('(') + 1, sql.lastIndexOf(')'));
    return body
        .split('\n')
        .map((line) => line.trim().split(/\s+/)[0])
        .filter((name) => /^[a-z_]+$/.test(name));
}

export function createServerSchemaBag11Suite(): TestSuite {
    const suite = new TestSuite('ServerSchemaBag11 (伺服器裝備記錄列 BAG-11)');

    suite.test('合法的武將裝備列與倉庫列都沒有問題', () => {
        assert.equals(0, validateGearEquipRecordRow(row()).length);
        assert.equals(0, validateGearEquipRecordRow(row({ general_uid: null, slot_type: 'WAREHOUSE', is_locked: true })).length);
    });

    suite.test('slot_type 必為八種代碼之一', () => {
        assert.equals(8, GEAR_SLOT_TYPES.length);
        const issues = validateGearEquipRecordRow(row({ slot_type: 'MOUNT' }));
        assert.isTrue(issues.some((issue) => issue.path === 'slot_type'));
    });

    suite.test('general_uid 為 NULL 時 slot_type 必須是 WAREHOUSE，有武將時不可是 WAREHOUSE', () => {
        const loose = validateGearEquipRecordRow(row({ general_uid: null, slot_type: 'WEAPON' }));
        assert.isTrue(loose.some((issue) => issue.message.includes('WAREHOUSE')));
        const stuck = validateGearEquipRecordRow(row({ general_uid: 'G501', slot_type: 'WAREHOUSE' }));
        assert.isTrue(stuck.some((issue) => issue.message.includes('不可為 WAREHOUSE')));
    });

    suite.test('ID 長度超過 32 或為空字串會被擋', () => {
        const longId = 'X'.repeat(33);
        assert.isTrue(validateGearEquipRecordRow(row({ equip_id: longId })).some((issue) => issue.path === 'equip_id'));
        assert.isTrue(validateGearEquipRecordRow(row({ item_id: '' })).some((issue) => issue.path === 'item_id'));
    });

    suite.test('數量必須為正整數，is_locked 必須為布林', () => {
        assert.isTrue(validateGearEquipRecordRow(row({ count: 0 })).some((issue) => issue.path === 'count'));
        assert.isTrue(validateGearEquipRecordRow(row({ count: 1.5 })).some((issue) => issue.path === 'count'));
        assert.isTrue(validateGearEquipRecordRow(row({ is_locked: 1 as unknown as boolean })).some((issue) => issue.path === 'is_locked'));
    });

    suite.test('acquired_at 不可解析時會被擋', () => {
        assert.isTrue(validateGearEquipRecordRow(row({ acquired_at: 'not-a-date' })).some((issue) => issue.path === 'acquired_at'));
    });

    suite.test('DDL 欄位與列型別欄位一致', () => {
        const expected = ['equip_id', 'player_id', 'general_uid', 'item_id', 'slot_type', 'count', 'is_locked', 'acquired_at'];
        assert.equals(expected.join(','), fieldsInDdl().join(','));
    });

    return suite;
}
