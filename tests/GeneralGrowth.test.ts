/**
 * GeneralGrowth — 六色屬性依年齡階段修正（WBS GEN-11，PROG-2-0553）
 */
import { assert, TestSuite } from './TestRunner';
import { agePhaseLabel, agePhaseOf, applyAgeToStats, ageStatMultiplier, SixStats } from '../assets/scripts/core/models/GeneralGrowth';
import { BATTLE_POWER_CONSTANTS } from '../assets/scripts/core/systems/BattlePowerRating';

const BASE: SixStats = { str: 100, int: 80, lea: 90, pol: 70, cha: 60, luk: 50 };

export function createGeneralGrowthSuite(): TestSuite {
    const suite = new TestSuite('GeneralGrowth (六色屬性年齡修正 GEN-11)');

    suite.test('階段邊界：每個邊界落在正確的階段（左閉右開）', () => {
        assert.equals('Child', agePhaseOf(0));
        assert.equals('Child', agePhaseOf(4.9));
        assert.equals('Youth', agePhaseOf(5));
        assert.equals('Youth', agePhaseOf(14.9));
        assert.equals('Prime', agePhaseOf(15));
        assert.equals('Prime', agePhaseOf(39.9));
        assert.equals('Peak', agePhaseOf(40));
        assert.equals('Peak', agePhaseOf(54.9));
        assert.equals('Elder', agePhaseOf(55));
        assert.equals('Elder', agePhaseOf(64.9));
        assert.equals('Over', agePhaseOf(65));
        assert.equals('Child', agePhaseOf(-3));
    });

    suite.test('係數與 LIFE-02 一致：直接對照 BATTLE_POWER_CONSTANTS.AGE_MODIFIER', () => {
        assert.equals(BATTLE_POWER_CONSTANTS.AGE_MODIFIER.Child, ageStatMultiplier(3));
        assert.equals(BATTLE_POWER_CONSTANTS.AGE_MODIFIER.Youth, ageStatMultiplier(10));
        assert.equals(BATTLE_POWER_CONSTANTS.AGE_MODIFIER.Prime, ageStatMultiplier(25));
        assert.equals(BATTLE_POWER_CONSTANTS.AGE_MODIFIER.Peak, ageStatMultiplier(45));
        assert.equals(BATTLE_POWER_CONSTANTS.AGE_MODIFIER.Elder, ageStatMultiplier(60));
        assert.equals(BATTLE_POWER_CONSTANTS.AGE_MODIFIER.Over, ageStatMultiplier(70));
    });

    suite.test('巔峰期加成：壯年（40~55）屬性 ×1.1，高於青年', () => {
        const prime = applyAgeToStats(BASE, 25);
        const peak = applyAgeToStats(BASE, 45);
        assert.equals(100, prime.str);
        assert.equals(110, peak.str);
        assert.isTrue(peak.str > prime.str);
    });

    suite.test('年齡衰減：老年 ×0.8、退役候選 ×0.5，幼兒 ×0（不可用）', () => {
        assert.equals(80, applyAgeToStats(BASE, 60).str);
        assert.equals(50, applyAgeToStats(BASE, 70).str);
        assert.equals(0, applyAgeToStats(BASE, 3).str);
    });

    suite.test('六個屬性全部套用同一個係數，取整為整數', () => {
        const scaled = applyAgeToStats(BASE, 10);
        assert.equals(60, scaled.str);
        assert.equals(48, scaled.int);
        assert.equals(54, scaled.lea);
        assert.equals(42, scaled.pol);
        assert.equals(36, scaled.cha);
        assert.equals(30, scaled.luk);
    });

    suite.test('階段標籤：有年齡給中文階段，沒有年齡回傳 null（詳情保留鎖定文字）', () => {
        assert.equals('幼兒', agePhaseLabel(3) ?? '');
        assert.equals('壯年・巔峰', agePhaseLabel(45) ?? '');
        assert.equals('退役候選', agePhaseLabel(70) ?? '');
        assert.isTrue(agePhaseLabel(undefined) === null);
        assert.isTrue(agePhaseLabel(NaN) === null);
    });

    return suite;
}
