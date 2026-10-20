/**
 * DataSchemaEnumRules — §2-2 補充欄位的列舉與跨欄位規則（DS-07，PROG-2-0499）
 *
 * 驗證重點：
 *   1. 列舉欄位寫入非法值會被拒絕，合法值通過
 *   2. 跨欄位規則（Sortie 不重覆、Scene preset 對齊、Equipped_Spirit 對回）會被檢出
 *   3. 教官邊界禁止回寫血緣欄位
 *   4. 空資料與缺欄位不報錯
 */
import { assert, TestSuite } from './TestRunner';
import { validateSection22Rules } from '../assets/scripts/core/models/DataSchemaEnumRules';

function hasError(errors: string[], fragment: string): boolean {
    return errors.some((error) => error.includes(fragment));
}

export function createDataSchemaEnumRulesSuite(): TestSuite {
    const suite = new TestSuite('DataSchemaEnumRules (§2-2 列舉與跨欄位規則 DS-07)');

    suite.test('空的 Data 區塊通過（缺欄位不報錯）', () => {
        assert.equals(0, validateSection22Rules({}).length);
    });

    suite.test('Child_Preview.Revelation_Level：四個合法值通過，非法值拒絕', () => {
        for (const level of ['HIDDEN', 'TENDENCY', 'RANGE', 'EXACT']) {
            assert.equals(0, validateSection22Rules({ Child_Preview: { Revelation_Level: level } }).length, level);
        }
        assert.isTrue(hasError(validateSection22Rules({ Child_Preview: { Revelation_Level: 'SECRET' } }), 'Child_Preview.Revelation_Level'));
    });

    suite.test('Bonding_Sessions[*].Breeding_Mode：只允許 Standard / Peace_Lineage', () => {
        assert.equals(0, validateSection22Rules({ Bonding_Sessions: [{ Breeding_Mode: 'Peace_Lineage' }] }).length);
        assert.isTrue(hasError(validateSection22Rules({ Bonding_Sessions: [{ Breeding_Mode: 'Fast' }] }), 'Breeding_Mode'));
    });

    suite.test('Mentor_Pool：Role_Boundary 固定 TeachingOnly，且不得回寫父母與受孕欄位', () => {
        assert.equals(0, validateSection22Rules({ Mentor_Pool: [{ Role_Boundary: 'TeachingOnly' }] }).length);
        assert.isTrue(hasError(validateSection22Rules({ Mentor_Pool: [{ Role_Boundary: 'Parent' }] }), 'Role_Boundary'));
        assert.isTrue(hasError(validateSection22Rules({ Mentor_Pool: [{ Father_UID: 'G001' }] }), 'Mentor_Pool.Father_UID'));
        assert.isTrue(hasError(validateSection22Rules({ Mentor_Pool: [{ Conception_Rate: 0.3 }] }), 'Conception_Rate'));
    });

    suite.test('Nurture_Sessions[*].Mentoring_Mode_Log：只允許 Support / Legendary_Mentoring', () => {
        assert.equals(0, validateSection22Rules({ Nurture_Sessions: [{ Mentoring_Mode_Log: 'Legendary_Mentoring' }] }).length);
        assert.isTrue(hasError(validateSection22Rules({ Nurture_Sessions: [{ Mentoring_Mode_Log: 'Basic' }] }), 'Mentoring_Mode_Log'));
    });

    suite.test('Gacha_State.*.Pool_Positioning：只允許 Bloodline_Seed / Nurture_Depth，回流虎符或 DP 會標註', () => {
        assert.equals(0, validateSection22Rules({ Gacha_State: { Main: { Pool_Positioning: 'Nurture_Depth' } } }).length);
        const errors = validateSection22Rules({ Gacha_State: { Main: { Pool_Positioning: 'Tiger_Tally' } } });
        assert.isTrue(hasError(errors, 'Pool_Positioning'));
        assert.isTrue(hasError(errors, '不得回流'));
    });

    suite.test('Sortie_Loadout：Commander / Strategist / Deputy 不得重覆，未填位置不比對', () => {
        assert.equals(0, validateSection22Rules({ Sortie_Loadout: { Commander_UID: 'G001', Strategist_UID: 'G002', Deputy_UID: '' } }).length);
        assert.isTrue(hasError(
            validateSection22Rules({ Sortie_Loadout: { Commander_UID: 'G001', Strategist_UID: 'G001' } }),
            'Commander_UID 與 Strategist_UID',
        ));
    });

    suite.test('Battle_State.Scene_Preset_ID 必須與 Scene_Gambit_State.Tile_Preset_ID 一致', () => {
        const aligned = { Battle_State: { Scene_Preset_ID: 'P1' }, Scene_Gambit_State: { Tile_Preset_ID: 'P1' } };
        assert.equals(0, validateSection22Rules(aligned).length);
        const drift = { Battle_State: { Scene_Preset_ID: 'P1' }, Scene_Gambit_State: { Tile_Preset_ID: 'P2' } };
        assert.isTrue(hasError(validateSection22Rules(drift), 'Scene_Preset_ID'));
    });

    suite.test('Journal_Entries[*].Source_Action_Seq_Range：必須是非負整數 [起, 迄] 且起不大於迄', () => {
        const ok = { General_Journal: { Journal_Entries: [{ Source_Action_Seq_Range: [3, 9] }] } };
        assert.equals(0, validateSection22Rules(ok).length);
        const reversed = { General_Journal: { Journal_Entries: [{ Source_Action_Seq_Range: [9, 3] }] } };
        assert.isTrue(hasError(validateSection22Rules(reversed), 'Source_Action_Seq_Range'));
        const fractional = { General_Journal: { Journal_Entries: [{ Source_Action_Seq_Range: [1.5, 3] }] } };
        assert.isTrue(hasError(validateSection22Rules(fractional), 'Source_Action_Seq_Range'));
    });

    suite.test('Season_History[*]：必備欄位缺一即回報', () => {
        const complete = {
            Season_Name: 'S1', Final_Rank: 'Gold', Final_Points: 1200, Best_Win_Streak: 5, Snapshot_ID: 'SNAP_1',
        };
        assert.equals(0, validateSection22Rules({ Tournament_Data: { Season_History: [complete] } }).length);
        const { Snapshot_ID: _omitted, ...incomplete } = complete;
        assert.isTrue(hasError(validateSection22Rules({ Tournament_Data: { Season_History: [incomplete] } }), 'Snapshot_ID'));
    });

    suite.test('Equipped_Spirit_UID：必須對回 Spirit_Card_Collection.Spirit_ID', () => {
        const data = {
            Spirit_Card_Collection: [{ Spirit_ID: 'SP_01' }],
            Generals: { G001: { Equipped_Spirit_UID: 'SP_01' }, G002: { Equipped_Spirit_UID: 'SP_99' } },
        };
        const errors = validateSection22Rules(data);
        assert.equals(1, errors.length);
        assert.isTrue(hasError(errors, 'Generals.G002.Equipped_Spirit_UID'));
    });

    return suite;
}
