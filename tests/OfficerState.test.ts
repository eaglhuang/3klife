/**
 * 官職階位、經驗與晉升（OFC-01 / OFC-02 / OFC-03 / OFC-09）
 *
 * 鎖住：經驗公式（F-1）、階位門檻（F-2）、連升多階、解鎖歷史一次性、
 * 天下大亂保留（F-3）、讀檔壞值退回、快照格式對上 HALL-11。
 */
import { assert, TestSuite } from './TestRunner';
import {
    addOfficerExp,
    applyEraShiftToOfficerState,
    calcOfficerExpGain,
    initialOfficerState,
    normalizeOfficerState,
    OFFICER_TIER_EXP_THRESHOLDS,
    tierForExp,
    toOfficerSnapshot,
} from '../assets/scripts/core/systems/OfficerState';

export function createOfficerStateSuite(): TestSuite {
    const suite = new TestSuite('OfficerState (官職階位與晉升 OFC-03)');

    suite.test('經驗公式 F-1：難度底數 × 軍事 1.1 × 失敗 0.4，取 floor', () => {
        assert.equals(10, calcOfficerExpGain({ difficulty: 'EASY', boardType: 'DOMESTIC', success: true }));
        assert.equals(19, calcOfficerExpGain({ difficulty: 'NORMAL', boardType: 'MILITARY', success: true }));
        assert.equals(18, calcOfficerExpGain({ difficulty: 'NORMAL', boardType: 'DOMESTIC', success: true }));
        assert.equals(7, calcOfficerExpGain({ difficulty: 'NORMAL', boardType: 'DOMESTIC', success: false }));
        assert.equals(31, calcOfficerExpGain({ difficulty: 'HELL', boardType: 'MILITARY', success: false }));
    });

    suite.test('階位門檻 F-2：100 / 260 / 520 / 920，門檻前一點仍在下一階之下', () => {
        assert.equals(100, OFFICER_TIER_EXP_THRESHOLDS[2]);
        assert.equals(260, OFFICER_TIER_EXP_THRESHOLDS[3]);
        assert.equals(520, OFFICER_TIER_EXP_THRESHOLDS[4]);
        assert.equals(920, OFFICER_TIER_EXP_THRESHOLDS[5]);
        assert.equals(1, tierForExp(99));
        assert.equals(2, tierForExp(100));
        assert.equals(2, tierForExp(259));
        assert.equals(5, tierForExp(99999));
    });

    suite.test('晉升判定：跨門檻即升，連升多階時依序列出且各階只寫一次解鎖歷史', () => {
        const once = addOfficerExp(initialOfficerState(), 120);
        assert.equals(2, once.state.currentTier);
        assert.equals(JSON.stringify([2]), JSON.stringify(once.promotedTiers));
        const jump = addOfficerExp(initialOfficerState(), 600);
        assert.equals(4, jump.state.currentTier);
        assert.equals(JSON.stringify([2, 3, 4]), JSON.stringify(jump.promotedTiers));
        assert.equals(JSON.stringify([1, 2, 3, 4]), JSON.stringify(jump.state.unlockHistory));
        const again = addOfficerExp(jump.state, 10);
        assert.equals(0, again.promotedTiers.length);
        assert.equals(JSON.stringify([1, 2, 3, 4]), JSON.stringify(again.state.unlockHistory));
    });

    suite.test('天下大亂 F-3：階位、經驗與解鎖歷史全部保留', () => {
        const state = addOfficerExp(initialOfficerState(), 300).state;
        const after = applyEraShiftToOfficerState(state);
        assert.equals(JSON.stringify(state), JSON.stringify(after));
    });

    suite.test('讀檔：壞值退回初始；經驗與階位互相對齊，解鎖歷史含所有已達階位', () => {
        assert.equals(JSON.stringify(initialOfficerState()), JSON.stringify(normalizeOfficerState(null)));
        const fixed = normalizeOfficerState({ currentTier: 1, officerExp: 300, unlockHistory: [9, 'x'] });
        assert.equals(3, fixed.currentTier);
        assert.equals(JSON.stringify([1, 2, 3]), JSON.stringify(fixed.unlockHistory));
        assert.equals(0, normalizeOfficerState({ officerExp: -5 }).officerExp);
    });

    suite.test('快照格式：對上 HALL-11 的 OFFICER_TIER_n 代碼', () => {
        const snap = toOfficerSnapshot(addOfficerExp(initialOfficerState(), 260).state);
        assert.equals(3, snap.tier);
        assert.equals('OFFICER_TIER_3', snap.code);
    });

    return suite;
}
