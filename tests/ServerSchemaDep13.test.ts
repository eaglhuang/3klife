/**
 * ServerSchemaDep13 — 戰場部署紀錄 Server 列（DEP-13 / PROG-2-0977）
 *
 * 驗證重點：
 *   1. 合法列沒有任何問題
 *   2. 三個出征角色不得重覆；NULL 的參謀官／後勤官不算重覆
 *   3. 無參謀官／後勤官時，對應加成必須為 0
 *   4. 軍勢守恆（戰損＋返還 ≤ 上限）與精銳次數不得超過精銳上限
 *   5. 非負整數、ID 長度、TINYINT 上限
 */
import { assert, TestSuite } from './TestRunner';
import { BattleDeployRecordRow, validateBattleDeployRecordRow } from '../server/schema/dep13-row-validators';

function row(overrides: Partial<BattleDeployRecordRow> = {}): BattleDeployRecordRow {
    return {
        battle_id: 'B_0001',
        player_id: 'P_0001',
        commander_uid: 'G501',
        strategist_uid: 'G188',
        deputy_uid: 'G233',
        food_spent: 3500,
        sortie_troops_max: 8000,
        troops_lost: 1200,
        troops_returned: 4000,
        food_cap_bonus: 1200,
        tactic_cap_bonus: 18,
        tactic_start_bonus: 9,
        elite_cap: 4,
        militia_count: 2,
        elite_count: 2,
        scene_preset_id: 'SCENE_NIGHT_RAID',
        delegate_used: false,
        ...overrides,
    };
}

function paths(overrides: Partial<BattleDeployRecordRow>): string[] {
    return validateBattleDeployRecordRow(row(overrides)).map((issue) => issue.path);
}

export function createServerSchemaDep13Suite(): TestSuite {
    const suite = new TestSuite('ServerSchemaDep13 (戰場部署紀錄 Server 列 DEP-13)');

    suite.test('合法列沒有任何問題', () => {
        assert.equals(0, validateBattleDeployRecordRow(row()).length);
    });

    suite.test('出征三角色不得重覆；NULL 的參謀官與後勤官不算重覆', () => {
        assert.isTrue(paths({ strategist_uid: 'G501' }).includes('strategist_uid'));
        assert.isTrue(paths({ deputy_uid: 'G188' }).includes('deputy_uid'));
        assert.equals(0, validateBattleDeployRecordRow(row({ strategist_uid: null, deputy_uid: null, tactic_cap_bonus: 0, tactic_start_bonus: 0, food_cap_bonus: 0 })).length);
    });

    suite.test('無參謀官或後勤官時，對應加成必須為 0', () => {
        const noStrategist = validateBattleDeployRecordRow(row({ strategist_uid: null }));
        assert.isTrue(noStrategist.some((issue) => issue.path === 'tactic_cap_bonus'));
        assert.isTrue(noStrategist.some((issue) => issue.path === 'tactic_start_bonus'));
        const noDeputy = validateBattleDeployRecordRow(row({ deputy_uid: null }));
        assert.isTrue(noDeputy.some((issue) => issue.path === 'food_cap_bonus'));
    });

    suite.test('戰損加返還超過出征軍勢上限會被擋下', () => {
        assert.isTrue(paths({ troops_lost: 4001, troops_returned: 4000 }).includes('troops_lost'));
        assert.equals(0, validateBattleDeployRecordRow(row({ troops_lost: 4000, troops_returned: 4000 })).length);
    });

    suite.test('精銳部署次數不得超過精銳部署上限', () => {
        assert.isTrue(paths({ elite_cap: 2, elite_count: 3 }).includes('elite_count'));
    });

    suite.test('非負整數、ID 長度與 TINYINT 上限', () => {
        assert.isTrue(paths({ food_spent: -1 }).includes('food_spent'));
        assert.isTrue(paths({ militia_count: 1.5 }).includes('militia_count'));
        assert.isTrue(paths({ battle_id: '' }).includes('battle_id'));
        assert.isTrue(paths({ scene_preset_id: 'X'.repeat(33) }).includes('scene_preset_id'));
        assert.isTrue(paths({ elite_cap: 256, elite_count: 0 }).includes('elite_cap'));
    });

    return suite;
}
