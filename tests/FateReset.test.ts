/**
 * FateReset — 天命重置卷：扣 1 張重擲天命波動、不疊加、沒道具不擲（LUK-07；PROG-2-1923）
 */
import { assert, TestSuite } from './TestRunner';
import { resetFateWave } from '../assets/scripts/core/systems/FateReset';
import { itemDefOf, ITEM_FATE_RESET_SCROLL } from '../assets/scripts/core/systems/ItemDef';
import type { EpBreakdown } from '../assets/scripts/core/systems/BreedingSystem';

function items(count: number) {
    const s = { count, consume: () => { if (s.count <= 0) return false; s.count -= 1; return true; } };
    return s;
}

const EP = { ep: 70, fate: -8, rating: '良才美質' } as unknown as EpBreakdown;

export function createFateResetSuite(): TestSuite {
    const suite = new TestSuite('FateReset (天命重置卷 LUK-07 PROG-2-1923)');

    suite.test('扣 1 張重擲：舊波動被替換而非疊加', () => {
        const inv = items(2);
        const r = resetFateWave(EP, 90, () => 0.5, inv);
        assert.isTrue(r.ok);
        assert.equals(1, inv.count);
        assert.equals(10, r.ep.fate);
        assert.equals(88, r.ep.ep);
        assert.equals(70, EP.ep);
    });

    suite.test('沒有道具不擲骰；道具已登錄', () => {
        const r = resetFateWave(EP, 90, () => { throw new Error('不應擲骰'); }, items(0));
        assert.isFalse(r.ok);
        assert.equals(70, r.ep.ep);
        assert.equals('天命重置卷', itemDefOf(ITEM_FATE_RESET_SCROLL)?.name);
    });

    return suite;
}
