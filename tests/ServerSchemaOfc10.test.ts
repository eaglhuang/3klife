/**
 * ServerSchemaOfc10 — 官職狀態 Server 列（OFC-10 / PROG-2-0808）
 *
 * 驗證重點：
 *   1. 本機狀態 → 列 → 本機狀態往返一致
 *   2. 列驗證擋下：代碼超界、經驗不足門檻、解鎖歷史亂序／不含目前階位、天下大亂旗標為 false
 *   3. 壞列不會轉成本機狀態
 */
import { assert, TestSuite } from './TestRunner';
import {
    officerStateToRow,
    OfficerStateRow,
    rowToOfficerState,
    validateOfficerStateRow,
} from '../server/schema/ofc10-officer-row';

function row(overrides: Partial<OfficerStateRow> = {}): OfficerStateRow {
    return {
        player_id: 'P_0001',
        officer_tier: 'OFFICER_TIER_3',
        officer_exp: 300,
        unlock_history_json: '[1,2,3]',
        persist_across_era_shift: true,
        ...overrides,
    };
}

export function createServerSchemaOfc10Suite(): TestSuite {
    const suite = new TestSuite('ServerSchemaOfc10 (官職狀態 Server 列 OFC-10)');

    suite.test('本機狀態 → 列 → 本機狀態往返一致，天下大亂旗標固定為 true', () => {
        const state = { currentTier: 3, officerExp: 300, unlockHistory: [1, 2, 3] };
        const written = officerStateToRow('P_0001', state);
        assert.equals('OFFICER_TIER_3', written.officer_tier);
        assert.equals('[1,2,3]', written.unlock_history_json);
        assert.isTrue(written.persist_across_era_shift);
        const read = rowToOfficerState(written);
        assert.isTrue(read.ok);
        assert.equals(3, read.ok ? read.state.currentTier : 0);
        assert.equals(300, read.ok ? read.state.officerExp : 0);
        assert.equals('1,2,3', read.ok ? read.state.unlockHistory.join(',') : '');
    });

    suite.test('階位代碼超界或格式錯誤時擋下', () => {
        assert.isTrue(validateOfficerStateRow(row({ officer_tier: 'OFFICER_TIER_6' })).length > 0);
        assert.isTrue(validateOfficerStateRow(row({ officer_tier: 'TIER_3' })).length > 0);
    });

    suite.test('經驗不足該階門檻時擋下（tier 3 需 260）', () => {
        const issues = validateOfficerStateRow(row({ officer_exp: 259 }));
        assert.equals('officer_exp', issues[0]?.path ?? '');
        assert.equals(0, validateOfficerStateRow(row({ officer_exp: 260 })).length);
    });

    suite.test('解鎖歷史亂序、重複或不含目前階位時擋下', () => {
        assert.isTrue(validateOfficerStateRow(row({ unlock_history_json: '[1,3,2]' })).length > 0);
        assert.isTrue(validateOfficerStateRow(row({ unlock_history_json: '[1,1,3]' })).length > 0);
        assert.isTrue(validateOfficerStateRow(row({ unlock_history_json: '[1,2]' })).length > 0);
        assert.isTrue(validateOfficerStateRow(row({ unlock_history_json: 'not-json' })).length > 0);
    });

    suite.test('天下大亂保留旗標為 false 時擋下（F-3）', () => {
        const issues = validateOfficerStateRow(row({ persist_across_era_shift: false }));
        assert.equals('persist_across_era_shift', issues[0]?.path ?? '');
    });

    suite.test('壞列不會轉成本機狀態', () => {
        const result = rowToOfficerState(row({ officer_exp: 1 }));
        assert.isFalse(result.ok);
    });

    return suite;
}
