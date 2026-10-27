/**
 * ServerSchemaSaveSnapshot — users／save_snapshots Server 列（DS-13 / PROG-2-1030）
 *
 * 驗證重點：
 *   1. 合法列沒有任何問題
 *   2. Player_ID／Account 不可為空，長度上限
 *   3. Save_Version 須為 x.y.z
 *   4. Last_Sync_Hash 須為 64 位十六進位
 *   5. Save_Data_JSON 須為合法 JSON 且根節點含 Data 物件
 *   6. 時間字串可解析
 */
import { assert, TestSuite } from './TestRunner';
import {
    SaveSnapshotRow,
    UserRow,
    validateSaveSnapshotRow,
    validateUserRow,
} from '../server/schema/save-snapshot-row-validators';

const HASH = 'a'.repeat(64);

function user(overrides: Partial<UserRow> = {}): UserRow {
    return { Player_ID: 'player-1', Account: 'pilot@example.com', Created_At: '2026-10-21T00:00:00Z', ...overrides };
}

function snapshot(overrides: Partial<SaveSnapshotRow> = {}): SaveSnapshotRow {
    return {
        Player_ID: 'player-1',
        Save_Version: '1.0.5',
        Save_Data_JSON: JSON.stringify({ Data: { Player_Economy: {} } }),
        Last_Sync_Hash: HASH,
        Session_Secret: 'secret-1',
        Updated_At: '2026-10-21T00:00:00Z',
        ...overrides,
    };
}

export function createServerSchemaSaveSnapshotSuite(): TestSuite {
    const suite = new TestSuite('ServerSchemaSaveSnapshot (users／save_snapshots 列 DS-13)');

    suite.test('合法的 users 與 save_snapshots 列沒有任何問題', () => {
        assert.equals(0, validateUserRow(user()).length);
        assert.equals(0, validateSaveSnapshotRow(snapshot()).length);
    });

    suite.test('Player_ID 與 Account 不可為空，超過長度上限會被擋', () => {
        assert.isTrue(validateUserRow(user({ Player_ID: '   ' })).some((i) => i.path === 'Player_ID'));
        assert.isTrue(validateUserRow(user({ Account: '' })).some((i) => i.path === 'Account'));
        assert.isTrue(validateUserRow(user({ Player_ID: 'x'.repeat(33) })).some((i) => i.path === 'Player_ID'));
        assert.isTrue(validateUserRow(user({ Account: 'x'.repeat(65) })).some((i) => i.path === 'Account'));
    });

    suite.test('Save_Version 須為 x.y.z 格式', () => {
        assert.equals(0, validateSaveSnapshotRow(snapshot({ Save_Version: '1.0.5' })).length);
        assert.isTrue(validateSaveSnapshotRow(snapshot({ Save_Version: '1.0' })).some((i) => i.path === 'Save_Version'));
        assert.isTrue(validateSaveSnapshotRow(snapshot({ Save_Version: 'v1.0.5' })).some((i) => i.path === 'Save_Version'));
    });

    suite.test('Last_Sync_Hash 須為 64 位十六進位', () => {
        assert.isTrue(validateSaveSnapshotRow(snapshot({ Last_Sync_Hash: 'abc' })).some((i) => i.path === 'Last_Sync_Hash'));
        assert.isTrue(validateSaveSnapshotRow(snapshot({ Last_Sync_Hash: 'g'.repeat(64) })).some((i) => i.path === 'Last_Sync_Hash'));
    });

    suite.test('Save_Data_JSON 必須是合法 JSON 且根節點含 Data 物件', () => {
        assert.isTrue(validateSaveSnapshotRow(snapshot({ Save_Data_JSON: '{not json' })).some((i) => i.path === 'Save_Data_JSON'));
        assert.isTrue(validateSaveSnapshotRow(snapshot({ Save_Data_JSON: '[1,2]' })).some((i) => i.path === 'Save_Data_JSON'));
        assert.isTrue(validateSaveSnapshotRow(snapshot({ Save_Data_JSON: '{"Save":{}}' })).some((i) => i.path === 'Save_Data_JSON'));
        assert.isTrue(validateSaveSnapshotRow(snapshot({ Save_Data_JSON: '{"Data":null}' })).some((i) => i.path === 'Save_Data_JSON'));
    });

    suite.test('時間字串無法解析時會被擋', () => {
        assert.isTrue(validateUserRow(user({ Created_At: 'not-a-date' })).some((i) => i.path === 'Created_At'));
        assert.isTrue(validateSaveSnapshotRow(snapshot({ Updated_At: 'nope' })).some((i) => i.path === 'Updated_At'));
    });

    return suite;
}
