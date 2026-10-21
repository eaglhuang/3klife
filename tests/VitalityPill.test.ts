/**
 * 補元散的精力回復與扣道具（VIT-05，PROG-2-0443）
 *
 * 鎖住：補元散 +50、高級補元散 +100；回復不超過上限；精力已滿或沒有道具時整體拒絕（背包與精力不變）；
 * 成功時只扣 1 個對應道具。售價不在本卡範圍。
 */
import { assert, TestSuite } from './TestRunner';
import { applyVitalityPill, useVitalityPill, VITALITY_PILL_RESTORE } from '../assets/scripts/core/systems/VitalityPill';
import { ITEM_PREMIUM_VITALITY_PILL, ITEM_VITALITY_PILL, itemCount, PlayerInventory } from '../assets/scripts/core/systems/PlayerInventory';

const withPills = (vitalityPill: number, premium: number): PlayerInventory => {
    const inv: Record<string, number> = {};
    if (vitalityPill > 0) inv[ITEM_VITALITY_PILL] = vitalityPill;
    if (premium > 0) inv[ITEM_PREMIUM_VITALITY_PILL] = premium;
    return inv;
};

export function createVitalityPillSuite(): TestSuite {
    const suite = new TestSuite('VitalityPill (補元散精力回復與扣道具 VIT-05)');

    suite.test('回復量：補元散 +50、高級補元散 +100', () => {
        assert.equals(50, VITALITY_PILL_RESTORE.vitalityPill);
        assert.equals(100, VITALITY_PILL_RESTORE.premiumVitalityPill);
    });

    suite.test('數值：未超過上限時照回復量加；接近上限時夾在上限', () => {
        assert.equals(70, applyVitalityPill(20, 120, 'vitalityPill'));
        assert.equals(120, applyVitalityPill(90, 120, 'vitalityPill'));
        assert.equals(100, applyVitalityPill(10, 100, 'premiumVitalityPill'));
    });

    suite.test('數值無效輸入保護：精力視為 0、上限無效視為 0', () => {
        assert.equals(50, applyVitalityPill(Number.NaN, 120, 'vitalityPill'));
        assert.equals(0, applyVitalityPill(10, Number.NaN, 'vitalityPill'));
    });

    suite.test('經派發器回復：高級補元散在精力歸零時回復 100，且不超過上限', () => {
        assert.equals(100, applyVitalityPill(0, 1000, 'premiumVitalityPill'));
        assert.equals(120, applyVitalityPill(110, 120, 'premiumVitalityPill'));
    });

    suite.test('使用成功：扣 1 個對應道具並回復精力', () => {
        const r = useVitalityPill(withPills(2, 0), 20, 120, 'vitalityPill');
        assert.isTrue(r.ok);
        if (!r.ok) return;
        assert.equals(70, r.vitality);
        assert.equals(50, r.restored);
        assert.equals(1, itemCount(r.inventory, ITEM_VITALITY_PILL));
    });

    suite.test('精力已滿：拒絕並回傳 vitality-full，不扣道具', () => {
        const inv = withPills(2, 0);
        const r = useVitalityPill(inv, 120, 120, 'vitalityPill');
        assert.isFalse(r.ok);
        if (r.ok) return;
        assert.equals('vitality-full', r.reason);
        assert.equals(2, itemCount(inv, ITEM_VITALITY_PILL));
    });

    suite.test('沒有道具：拒絕並回傳 no-item', () => {
        const r = useVitalityPill(withPills(0, 0), 20, 120, 'premiumVitalityPill');
        assert.isFalse(r.ok);
        if (r.ok) return;
        assert.equals('no-item', r.reason);
    });

    suite.test('高級補元散只扣高級道具，不動一般補元散', () => {
        const r = useVitalityPill(withPills(3, 1), 10, 120, 'premiumVitalityPill');
        assert.isTrue(r.ok);
        if (!r.ok) return;
        assert.equals(110, r.vitality);
        assert.equals(0, itemCount(r.inventory, ITEM_PREMIUM_VITALITY_PILL));
        assert.equals(3, itemCount(r.inventory, ITEM_VITALITY_PILL));
    });

    return suite;
}
