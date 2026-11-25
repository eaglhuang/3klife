/**
 * FloatTextPlacement.test.ts — 11/25 實跑修正：掠奪跳字依序錯開、倒下擬聲字偏移與延遲、揚塵粒子參數。
 * 純視覺（粒子實際看起來是否一顆顆分開、字是否壓到橫幅）無法單測，靠實機截圖驗證。
 */
import { assert, TestSuite } from './TestRunner';
import { LOOT_TEXT_LAYOUT, lootTextPlacement } from '../assets/scripts/battle/shared/TacticVfxHooks';
import { DEFEAT_VFX, defeatTextOffsetOf } from '../assets/scripts/battle/views/BattleFlowVfx';
import { DUST_PARTICLE_RANGES, moveDustFor, rollDustParticle } from '../assets/scripts/battle/shared/MoveFeedback';
import { TerrainType, TroopType } from '../assets/scripts/shared/CommonEnums';

export function createFloatTextPlacementSuite(): TestSuite {
    const suite = new TestSuite('FloatTextPlacement (跳字錯位／擬聲字偏移／揚塵粒子)');

    suite.test('掠奪跳字：第 0 項不偏移、後續依序延遲且垂直不重疊', () => {
        const a = lootTextPlacement(0);
        const b = lootTextPlacement(1);
        const c = lootTextPlacement(2);
        assert.equals(0, a.delaySec);
        assert.equals(0, a.x);
        assert.equals(LOOT_TEXT_LAYOUT.delaySec, b.delaySec);
        assert.equals(LOOT_TEXT_LAYOUT.delaySec * 2, c.delaySec);
        assert.isTrue(b.y < a.y && c.y < b.y, '每一項起點往下排開');
        assert.isTrue(a.y <= 0, '整組不往上抬，避免碰到上方橫幅');
        assert.isTrue(b.x !== c.x, '左右交錯');
    });

    suite.test('掠奪跳字：超過格數循環，垂直位移不無限增長；負數與小數安全', () => {
        const last = lootTextPlacement(LOOT_TEXT_LAYOUT.maxSlots - 1);
        const wrap = lootTextPlacement(LOOT_TEXT_LAYOUT.maxSlots);
        assert.equals(lootTextPlacement(0).y, wrap.y);
        assert.isTrue(last.y >= (LOOT_TEXT_LAYOUT.baseDropEm - LOOT_TEXT_LAYOUT.stepEm * LOOT_TEXT_LAYOUT.maxSlots) * 32);
        assert.equals(0, lootTextPlacement(-3).delaySec);
        assert.equals(lootTextPlacement(1).y, lootTextPlacement(1.9).y);
    });

    suite.test('掠奪跳字：相鄰兩項垂直間距至少 1.3 倍字級（11/25 放大後）', () => {
        const gap = lootTextPlacement(0, 32).y - lootTextPlacement(1, 32).y;
        assert.isTrue(gap >= 1.3 * 32, `間距 ${gap}`);
    });

    suite.test('位移隨字級縮放（不寫死像素）', () => {
        assert.equals(lootTextPlacement(1, 64).y, lootTextPlacement(1, 32).y * 2);
        assert.equals(defeatTextOffsetOf('a', 88).y, defeatTextOffsetOf('a', 44).y * 2);
    });

    suite.test('倒下擬聲字：延後約 0.15 秒、往側上方偏移，左右依單位交錯', () => {
        assert.isTrue(DEFEAT_VFX.textDelaySec >= 0.1 && DEFEAT_VFX.textDelaySec <= 0.3);
        const sides = new Set<number>();
        for (const id of ['player-1', 'player-2', 'enemy-1', 'enemy-2', 'player-general-x', 'a', 'b']) {
            const o = defeatTextOffsetOf(id);
            assert.equals(DEFEAT_VFX.textOffsetEmY * 44, o.y);
            assert.equals(DEFEAT_VFX.textOffsetEmX * 44, Math.abs(o.x));
            assert.isTrue(o.y > 0, '往上偏');
            sides.add(Math.sign(o.x));
        }
        assert.equals(2, sides.size, '兩側都會出現');
        assert.equals(defeatTextOffsetOf('player-1').x, defeatTextOffsetOf('player-1').x);
    });

    suite.test('揚塵：粒子數由兵種表決定、粒徑與終端大小受限，騎兵每次多於步兵', () => {
        const inf = moveDustFor(TroopType.Infantry, TerrainType.Plain);
        const cav = moveDustFor(TroopType.Cavalry, TerrainType.Plain);
        assert.isTrue(inf.particleMin >= 4 && cav.particleMin > inf.particleMin);
        for (const r of [0, 0.5, 0.999]) {
            const p = rollDustParticle(inf, () => r);
            assert.isTrue(p.startSize <= DUST_PARTICLE_RANGES.startSize[1]);
            assert.isTrue(p.rise >= DUST_PARTICLE_RANGES.rise[0], '往上揚起');
            assert.isTrue(Math.abs(p.jitterX) <= DUST_PARTICLE_RANGES.jitterX);
        }
        // 多顆粒子的起點水平散布要大於單顆終端粒徑，才分得開不糊成一塊
        assert.isTrue(DUST_PARTICLE_RANGES.jitterX * 2 > DUST_PARTICLE_RANGES.startSize[1]);
    });

    return suite;
}
