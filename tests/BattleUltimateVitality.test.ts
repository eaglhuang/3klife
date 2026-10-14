/**
 * 奧義扣精力與戰後結算基準（LIFE-10，PROG-2-0429）
 *
 * PM 裁定（2026-10-14）：奧義按精力上限 × 比例扣減（下限 0）；戰後結算以戰鬥結束時的精力為基準，
 * 再扣 BATTLE_VITALITY_COST，兩者疊加。
 *
 * 派發器的實際扣減需要完整戰鬥執行環境，不在單元測試範圍；這裡鎖住純計算與結算基準。
 */
import { assert, TestSuite } from './TestRunner';
import { spendUltimateVitality } from '../assets/scripts/core/systems/VitalityBattleGate';
import { BATTLE_VITALITY_COST, settleBattle } from '../assets/scripts/core/systems/BattleRoster';

/** 最小可用的名冊武將；只放結算會讀取的欄位 */
function rosterGeneral(vitality: number): Record<string, unknown> {
    return { id: 'hero', name: '測試', faction: 'player', hp: 100, vitality, maxVitality: 100 };
}

export function createBattleUltimateVitalitySuite(): TestSuite {
    const suite = new TestSuite('BattleUltimateVitality (奧義扣精力與戰後基準 LIFE-10)');

    suite.test('奧義扣精力：精力上限 × 比例，四捨五入', () => {
        assert.equals(95, spendUltimateVitality(100, 100, 0.05));
        assert.equals(20, spendUltimateVitality(30, 100, 0.1));
        assert.equals(94, spendUltimateVitality(100, 100, 0.06));
    });

    suite.test('奧義扣精力：下限為 0，不會變負數', () => {
        assert.equals(0, spendUltimateVitality(3, 100, 0.05));
    });

    suite.test('奧義扣精力：比例或上限無效時不扣，回傳原值', () => {
        assert.equals(50, spendUltimateVitality(50, 100, 0));
        assert.equals(50, spendUltimateVitality(50, 100, Number.NaN));
        assert.equals(50, spendUltimateVitality(50, 0, 0.05));
    });

    suite.test('戰後結算：以戰鬥結束精力為基準再扣 30（兩者疊加）', () => {
        const settlement = settleBattle([rosterGeneral(100) as never], {
            deployedIds: ['hero'],
            result: 'player-win' as never,
            vitalityAfterBattle: { hero: 60 },
        });
        assert.equals(1, settlement.entries.length);
        assert.equals(60, settlement.entries[0].vitalityBefore);
        assert.equals(60 - BATTLE_VITALITY_COST, settlement.entries[0].vitalityAfter);
    });

    suite.test('戰後結算：扣完下限為 0', () => {
        const settlement = settleBattle([rosterGeneral(100) as never], {
            deployedIds: ['hero'],
            result: 'player-win' as never,
            vitalityAfterBattle: { hero: 10 },
        });
        assert.equals(0, settlement.entries[0].vitalityAfter);
    });

    suite.test('戰後結算：沒有提供戰鬥結束精力時，沿用名冊值（舊行為不變）', () => {
        const settlement = settleBattle([rosterGeneral(100) as never], {
            deployedIds: ['hero'],
            result: 'player-win' as never,
        });
        assert.equals(100, settlement.entries[0].vitalityBefore);
        assert.equals(100 - BATTLE_VITALITY_COST, settlement.entries[0].vitalityAfter);
    });

    return suite;
}
