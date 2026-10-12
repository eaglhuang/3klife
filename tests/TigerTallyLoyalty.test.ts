// @spec-source → 兵種（虎符）系統.md §虎符拔除與忠誠度（PROG-2-0203）
/**
 * TigerTallyLoyalty — 虎符拔除 / 裝上忠誠度與反洗機制的 headless 測試（PROG-2-0203）
 */
import { TestSuite, assert } from './TestRunner';
import {
    applyTallyLoyaltyChange,
    createTallyLoyaltyState,
    TALLY_EQUIP_LOYALTY_BONUS,
    TALLY_REMOVE_LOYALTY_PENALTY,
} from '../assets/scripts/core/systems/TigerTallyLoyalty';

export function createTigerTallyLoyaltySuite(): TestSuite {
    const suite = new TestSuite('TigerTallyLoyalty');

    suite.test('數值表與規格一致：拔除 UR −25 / SSR −20 / SR −12 / R −5；裝上 UR +8 / SSR +5 / SR +3 / R +1', () => {
        assert.equals(-25, TALLY_REMOVE_LOYALTY_PENALTY.UR);
        assert.equals(-20, TALLY_REMOVE_LOYALTY_PENALTY.SSR);
        assert.equals(-12, TALLY_REMOVE_LOYALTY_PENALTY.SR);
        assert.equals(-5, TALLY_REMOVE_LOYALTY_PENALTY.R);
        assert.equals(8, TALLY_EQUIP_LOYALTY_BONUS.UR);
        assert.equals(5, TALLY_EQUIP_LOYALTY_BONUS.SSR);
        assert.equals(3, TALLY_EQUIP_LOYALTY_BONUS.SR);
        assert.equals(1, TALLY_EQUIP_LOYALTY_BONUS.R);
    });

    suite.test('單季拔除 UR：忠誠 60 → 35，倍率 1', () => {
        const result = applyTallyLoyaltyChange(createTallyLoyaltyState(60), 'unequip', 'UR', 1);
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals(35, result.state.loyalty);
        assert.equals(-25, result.delta);
        assert.equals(1, result.multiplier);
    });

    suite.test('裝上虎符：忠誠提升，不受連續季倍率影響', () => {
        let state = createTallyLoyaltyState(50);
        const first = applyTallyLoyaltyChange(state, 'unequip', 'R', 1);
        assert.isTrue(first.ok);
        if (!first.ok) return;
        state = first.state;
        const second = applyTallyLoyaltyChange(state, 'equip', 'SSR', 2);
        assert.isTrue(second.ok);
        if (!second.ok) return;
        assert.equals(1, second.multiplier, '連續第 2 季，裝上不加倍');
        assert.equals(state.loyalty + 5, second.state.loyalty);
    });

    suite.test('同一季第二次變更被擋下（SEASON_LIMIT），忠誠不變', () => {
        const first = applyTallyLoyaltyChange(createTallyLoyaltyState(60), 'unequip', 'SR', 7);
        assert.isTrue(first.ok);
        if (!first.ok) return;
        const second = applyTallyLoyaltyChange(first.state, 'equip', 'UR', 7);
        assert.isFalse(second.ok);
        if (second.ok) return;
        assert.equals('SEASON_LIMIT', second.reason);
        assert.equals(first.state.loyalty, second.state.loyalty);
    });

    suite.test('連續 2 季拔除：第 2 季降低量 ×1.5（SR −12 → −18）', () => {
        const first = applyTallyLoyaltyChange(createTallyLoyaltyState(80), 'unequip', 'SR', 10);
        assert.isTrue(first.ok);
        if (!first.ok) return;
        assert.equals(68, first.state.loyalty, '第 1 季 −12');
        const second = applyTallyLoyaltyChange(first.state, 'unequip', 'SR', 11);
        assert.isTrue(second.ok);
        if (!second.ok) return;
        assert.equals(1.5, second.multiplier);
        assert.equals(50, second.state.loyalty, '第 2 季 −18');
    });

    suite.test('中間隔一季：連續計數重置，不加倍', () => {
        const first = applyTallyLoyaltyChange(createTallyLoyaltyState(80), 'unequip', 'SR', 10);
        if (!first.ok) throw new Error('setup failed');
        const later = applyTallyLoyaltyChange(first.state, 'unequip', 'SR', 12);
        assert.isTrue(later.ok);
        if (!later.ok) return;
        assert.equals(1, later.multiplier, '隔了一季不算連續');
        assert.equals(56, later.state.loyalty, '−12 不加倍');
    });

    suite.test('忠誠夾在 0~100：拔除不會低於 0，裝上不會超過 100', () => {
        const low = applyTallyLoyaltyChange(createTallyLoyaltyState(5), 'unequip', 'UR', 1);
        assert.isTrue(low.ok);
        if (low.ok) assert.equals(0, low.state.loyalty);
        const high = applyTallyLoyaltyChange(createTallyLoyaltyState(98), 'equip', 'UR', 1);
        assert.isTrue(high.ok);
        if (high.ok) assert.equals(100, high.state.loyalty);
    });

    suite.test('轉蛋名將：忠誠鎖定 100，拔除不影響，也不計入每季次數', () => {
        const gacha = createTallyLoyaltyState(30, true);
        assert.equals(100, gacha.loyalty);
        const first = applyTallyLoyaltyChange(gacha, 'unequip', 'UR', 3);
        assert.isTrue(first.ok);
        if (!first.ok) return;
        assert.equals(100, first.state.loyalty);
        assert.equals(0, first.delta);
        const second = applyTallyLoyaltyChange(first.state, 'equip', 'R', 3);
        assert.isTrue(second.ok, '轉蛋名將同季不被擋');
    });

    return suite;
}
