/**
 * GachaDraw.test.ts — 轉蛋抽取引擎（規格機率、Up、保底）headless 測試（PROG-2-0335 / WBS GCH-02）
 *
 * 統計測試用固定 seed 的 LCG，結果可重現；容許誤差遠大於抽樣標準差。
 *
 * Unity 對照：EditMode Test 用固定亂數種子跑大量抽獎，檢查機率與保底。
 */
import { assert, TestSuite } from './TestRunner';
import {
    drawGeneralOnce,
    GachaPool,
    GACHA_RARITY_RATES,
    GACHA_UP_SHARE,
    normalizeGachaPity,
} from '../assets/scripts/core/systems/GachaDraw';

function lcg(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

const pool: GachaPool<string> = {
    ssrUp: ['su1', 'su2'],
    ssrOther: ['so1', 'so2', 'so3'],
    srUp: ['ru1'],
    srOther: ['ro1', 'ro2'],
    rOther: ['r1', 'r2', 'r3', 'r4'],
};

export function createGachaDrawSuite(): TestSuite {
    const suite = new TestSuite('GachaDraw (轉蛋抽取引擎 GCH-02)');

    suite.test('規格稀有度機率總和為 1，Up 占比與規格一致', () => {
        assert.isTrue(Math.abs(GACHA_RARITY_RATES.SSR + GACHA_RARITY_RATES.SR + GACHA_RARITY_RATES.R - 1) < 1e-9);
        assert.equals(0.03, GACHA_RARITY_RATES.SSR);
        assert.equals(0.10, GACHA_RARITY_RATES.SR);
        assert.equals(0.7, GACHA_UP_SHARE.SSR);
        assert.equals(0.8, GACHA_UP_SHARE.SR);
    });

    suite.test('固定 seed 大量抽樣：SSR ≈ 3%，SR ≈ 10% + 小保底提升（0.87/50）', () => {
        const rng = lcg(20261014);
        let pity = normalizeGachaPity(undefined);
        const counts: Record<string, number> = { SSR: 0, SR: 0, R: 0 };
        const N = 200000;
        for (let i = 0; i < N; i++) {
            const drawn = drawGeneralOnce(pool, pity, rng);
            pity = drawn.nextPity;
            counts[drawn.rarity]++;
        }
        const ssr = counts.SSR / N;
        const sr = counts.SR / N;
        const expectedSr = GACHA_RARITY_RATES.SR + GACHA_RARITY_RATES.R / 50;
        assert.isTrue(Math.abs(ssr - 0.03) < 0.003, `SSR 實際 ${ssr}`);
        assert.isTrue(Math.abs(sr - expectedSr) < 0.005, `SR 實際 ${sr}，期望 ${expectedSr}`);
        assert.equals(N, pity.pullCount);
    });

    suite.test('固定 seed：SSR 中 Up 約 70%，SR 中 Up 約 80%', () => {
        const rng = lcg(7);
        let pity = normalizeGachaPity(undefined);
        let ssrTotal = 0;
        let ssrUp = 0;
        let srTotal = 0;
        let srUp = 0;
        for (let i = 0; i < 300000; i++) {
            const drawn = drawGeneralOnce(pool, pity, rng);
            pity = drawn.nextPity;
            if (drawn.rarity === 'SSR') {
                ssrTotal++;
                if (drawn.item.startsWith('su')) ssrUp++;
            }
            if (drawn.rarity === 'SR') {
                srTotal++;
                if (drawn.item.startsWith('ru')) srUp++;
            }
        }
        assert.isTrue(Math.abs(ssrUp / ssrTotal - 0.7) < 0.01, `SSR Up ${ssrUp / ssrTotal}`);
        assert.isTrue(Math.abs(srUp / srTotal - 0.8) < 0.01, `SR Up ${srUp / srTotal}`);
    });

    suite.test('小保底：第 50 抽若擲到 R 則提升為 SR，並標記 pityApplied', () => {
        const alwaysR = () => 0.99;
        let pity = normalizeGachaPity(undefined);
        const rarities: string[] = [];
        let applied = 0;
        for (let i = 0; i < 50; i++) {
            const drawn = drawGeneralOnce(pool, pity, alwaysR);
            pity = drawn.nextPity;
            rarities.push(drawn.rarity);
            if (drawn.pityApplied) applied++;
        }
        assert.equals(49, rarities.filter((r) => r === 'R').length);
        assert.equals('SR', rarities[49]);
        assert.equals(1, applied);
    });

    suite.test('保底計數跨抽持續累加；舊存檔缺值或不合法時從 0 開始', () => {
        assert.equals(0, normalizeGachaPity(undefined).pullCount);
        assert.equals(0, normalizeGachaPity({ pullCount: 3.5 }).pullCount);
        assert.equals(0, normalizeGachaPity({ pullCount: -2 }).pullCount);
        assert.equals(7, normalizeGachaPity({ pullCount: 7 }).pullCount);
        const first = drawGeneralOnce(pool, { pullCount: 7 }, lcg(1));
        assert.equals(8, first.nextPity.pullCount);
    });

    suite.test('某稀有度池內沒有人時往下一階取，不丟錯', () => {
        const onlyR: GachaPool<string> = { ssrUp: [], ssrOther: [], srUp: [], srOther: [], rOther: ['x'] };
        const drawn = drawGeneralOnce(onlyR, normalizeGachaPity(undefined), () => 0.001);
        assert.equals('R', drawn.rarity);
        assert.equals('x', drawn.item);
    });

    suite.test('Up 桶為空時 SSR 從常設桶抽', () => {
        const noUp: GachaPool<string> = { ssrUp: [], ssrOther: ['so1'], srUp: [], srOther: ['ro1'], rOther: ['r1'] };
        const drawn = drawGeneralOnce(noUp, normalizeGachaPity(undefined), () => 0.001);
        assert.equals('SSR', drawn.rarity);
        assert.equals('so1', drawn.item);
    });

    suite.test('池內完全沒有武將時拋錯', () => {
        const empty: GachaPool<string> = { ssrUp: [], ssrOther: [], srUp: [], srOther: [], rOther: [] };
        assert.throws(() => drawGeneralOnce(empty, normalizeGachaPity(undefined), () => 0.5));
    });

    return suite;
}
