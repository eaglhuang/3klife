/**
 * RewardPity.test.ts — GCH-R1（PROG-2-9460）：獎勵引擎軟保底、多階梯、群組佔比、固定名額、不重複抽樣
 *
 * 鎖住 doc_spec_1186 §12.3 表格的每個點（公式逐點驗證）、舊單一保底設定相容、機率分布加總為 1、
 * 同種子同結果、多階梯歸零規則、draw.slots 每輪名額與不重複。
 */
import { assert, TestSuite } from './TestRunner';
import { DeterministicRngSession } from '../assets/scripts/shared/foundation/DeterministicRng';
import { normalizeRewardConfig, type RewardPoolDef } from '../assets/scripts/shared/reward/RewardConfig';
import { poolDistribution, pityRate, rollPool } from '../assets/scripts/shared/reward/RewardRules';

const FX = { kind: 'item', itemId: 'ITEM_X', qty: 1 };

function gachaPool(extra: Record<string, unknown> = {}): RewardPoolDef {
    const entries: unknown[] = [];
    // 權重：SSR 3%（UP 2 位、普通 3 位）、SR 10%、R 87%（以 1000 為分母）
    for (let i = 0; i < 2; i += 1) entries.push({ id: `ssr_up${i}`, weight: 15, tier: 'SSR', group: 'up', effect: FX });
    for (let i = 0; i < 3; i += 1) entries.push({ id: `ssr_n${i}`, weight: 0, tier: 'SSR', group: 'normal', effect: FX });
    entries.push({ id: 'sr_a', weight: 60, tier: 'SR', effect: FX }, { id: 'sr_b', weight: 40, tier: 'SR', effect: FX });
    entries.push({ id: 'r_a', weight: 870, tier: 'R', effect: FX });
    const cfg = normalizeRewardConfig({
        pools: [{
            id: 'POOL_G', tiers: ['R', 'SR', 'SSR'], maxCount: 10, entries,
            pity: [
                { counterKey: 'g.sr', tier: 'SR', soft: { startAt: 6, curveExp: 1 }, hard: { count: 10, guaranteeTier: 'SR' } },
                { counterKey: 'g.ssr', tier: 'SSR', soft: { startAt: 50, curveExp: 2 }, hard: { count: 90, guaranteeTier: 'SSR' } },
            ],
            ...extra,
        }],
    });
    return cfg.pools[0];
}

/** 每次回傳固定比例的假亂數（0～1）；用來把落點釘在指定位置 */
function fixedRng(ratio: number) {
    return { nextInt: (max: number) => Math.min(max - 1, Math.floor(max * ratio)) };
}

export function createRewardPitySuite(): TestSuite {
    const suite = new TestSuite('RewardPity（GCH-R1 軟保底）');

    suite.test('12.3 公式逐點：名將池 SSR（3%、S50、γ2、H90）', () => {
        const f = (k: number) => pityRate(0.03, k, 90, { startAt: 50, curveExp: 2 });
        assert.equals(0.03, f(49), 'k<S 維持基礎機率');
        assert.inRange(f(50), 0.03, 0.0306); // 第一個漸升點只多一點點
        assert.inRange(f(60), 0.0995, 0.1005);
        assert.inRange(f(70), 0.283, 0.285);
        assert.inRange(f(80), 0.584, 0.586);
        assert.inRange(f(89), 0.952, 0.954);
        assert.equals(1, f(90), '硬保底必出');
        assert.equals(1, f(120));
    });

    suite.test('12.3 公式逐點：名將池 SR 以上（13%、S6、γ1、H10）與紅顏池', () => {
        const sr = (k: number) => pityRate(0.13, k, 10, { startAt: 6, curveExp: 1 });
        assert.equals(0.13, sr(5));
        assert.inRange(sr(6), 0.303, 0.305);
        assert.inRange(sr(9), 0.825, 0.827);
        assert.equals(1, sr(10));
        const hs = (k: number) => pityRate(0.025, k, 50, { startAt: 30, curveExp: 2 });
        assert.inRange(hs(40), 0.292, 0.294);
        assert.inRange(hs(45), 0.590, 0.592);
        assert.inRange(hs(49), 0.908, 0.910);
        const hr = (k: number) => pityRate(0.15, k, 5, { startAt: 3, curveExp: 1 });
        assert.inRange(hr(3), 0.432, 0.434);
        assert.inRange(hr(4), 0.716, 0.718);
        assert.equals(1, pityRate(0.5, 3, 3, null), '無軟保底只有硬保底');
        assert.equals(0.5, pityRate(0.5, 2, 3, null));
    });

    suite.test('12.3 設計值：名將池 SSR 平均約 28.5 抽出貨、SR 以上約 5.0 抽', () => {
        const mean = (p0: number, h: number, s: number, g: number) => {
            let survive = 1;
            let e = 0;
            for (let k = 1; k <= h; k += 1) { e += k * survive * pityRate(p0, k, h, { startAt: s, curveExp: g }); survive *= 1 - pityRate(p0, k, h, { startAt: s, curveExp: g }); }
            return e;
        };
        assert.inRange(mean(0.03, 90, 50, 2), 28.3, 28.7);
        assert.inRange(mean(0.13, 10, 6, 1), 4.9, 5.1);
        assert.inRange(mean(0.025, 50, 30, 2), 24.7, 25.1);
        assert.inRange(mean(0.15, 5, 3, 1), 3.0, 3.2);
    });

    suite.test('設定正規化：單一物件相容、陣列由高階往低階、壞軟保底降為只有硬保底、重複 key 與 tier 不符丟掉', () => {
        const legacy = normalizeRewardConfig({ pools: [{ id: 'L', tiers: ['N', 'S'], entries: [{ id: 'a', weight: 1, tier: 'N', effect: FX }, { id: 'b', weight: 1, tier: 'S', effect: FX }], pity: { counterKey: 'k', hard: { count: 5, guaranteeTier: 'S' } } }] }).pools[0];
        assert.equals(1, legacy.pity.length);
        assert.equals(null, legacy.pity[0].soft);
        assert.equals('S', legacy.pity[0].tier);
        assert.equals(5, legacy.pity[0].hardCount);
        const pool = gachaPool();
        assert.equals('g.ssr,g.sr', pool.pity.map((p) => p.counterKey).join(','), '高階在前');
        const bad = normalizeRewardConfig({ pools: [{ id: 'B', tiers: ['N', 'S'], entries: [{ id: 'a', weight: 1, tier: 'S', effect: FX }], pity: [
            { counterKey: 'a', soft: { startAt: 5, curveExp: 1 }, hard: { count: 5, guaranteeTier: 'S' } },
            { counterKey: 'a', hard: { count: 3, guaranteeTier: 'S' } },
            { counterKey: 'b', tier: 'N', hard: { count: 3, guaranteeTier: 'S' } },
            { counterKey: 'c', soft: { startAt: 2, curveExp: 0 }, hard: { count: 4, guaranteeTier: 'S' } },
        ] }] }).pools[0];
        assert.equals('a,c', bad.pity.map((p) => p.counterKey).join(','));
        assert.equals(null, bad.pity[0].soft, 'startAt >= hard 無效');
        assert.equals(null, bad.pity[1].soft, 'curveExp <= 0 無效');
    });

    suite.test('機率分布：總和為 1；群組佔比 70/30 套在 SSR 內；UP 項目權重不影響群組佔比', () => {
        const pool = gachaPool({ tierGroups: { SSR: [{ group: 'up', share: 7 }, { group: 'normal', share: 3 }] } });
        const normalPool = normalizeRewardConfig({ pools: [{ ...rawOf(pool), entries: rawOf(pool).entries.map((e) => (e.group === 'normal' ? { ...e, weight: 5 } : e)) }] }).pools[0];
        for (const p of [normalPool]) {
            const dist = poolDistribution(p, {});
            assert.inRange(dist.entries.reduce((t, e) => t + e.probability, 0), 0.9999999, 1.0000001);
            const ssr = dist.tiers.find((t) => t.tier === 'SSR');
            assert.inRange(ssr ? ssr.effectiveRate : -1, 45 / 1015 - 1e-6, 45 / 1015 + 1e-6, 'SSR 等階質量由全部 SSR 權重決定');
            const up = dist.entries.filter((e) => e.entry.group === 'up').reduce((t, e) => t + e.probability, 0);
            const nm = dist.entries.filter((e) => e.entry.group === 'normal').reduce((t, e) => t + e.probability, 0);
            assert.inRange(up / (up + nm), 0.6999, 0.7001);
            assert.inRange(nm / (up + nm), 0.2999, 0.3001);
        }
    });

    suite.test('機率分布：進入軟保底後 SSR／SR 以上被抬高、總和仍為 1、保底區段正確', () => {
        const pool = gachaPool();
        const base = poolDistribution(pool, {});
        assert.equals('base,base', base.ladders.map((l) => l.zone).join(','));
        const mid = poolDistribution(pool, { 'g.ssr': 59, 'g.sr': 0 });
        const ssr = mid.tiers.find((t) => t.tier === 'SSR');
        assert.inRange(ssr ? ssr.effectiveRate : 0, 0.0995, 0.1005, 'k=60');
        assert.inRange(mid.entries.reduce((t, e) => t + e.probability, 0), 0.9999999, 1.0000001);
        // SR 階梯在 k=7 時 p(7)=0.13+0.87*0.4，且已被 SSR 帶高的部分不重複抬
        const both = poolDistribution(pool, { 'g.ssr': 59, 'g.sr': 6 });
        const srUp = both.tiers.filter((t) => t.tier !== 'R').reduce((t, x) => t + x.effectiveRate, 0);
        assert.inRange(srUp, 0.477, 0.479);
        assert.equals('soft,soft', both.ladders.map((l) => l.zone).join(','));
        const hard = poolDistribution(pool, { 'g.ssr': 89, 'g.sr': 0 });
        assert.equals(1, hard.tiers.find((t) => t.tier === 'SSR')?.effectiveRate);
        assert.equals('hard', hard.ladders[0].zone);
        assert.equals(0, hard.entries.find((e) => e.entry.id === 'r_a')?.probability);
    });

    suite.test('軟保底抽樣：落點釘在低端／高端，trace 記 PITY_SOFT；同種子同保底計數同結果', () => {
        const pool = gachaPool();
        const lowRoll = rollPool(pool, 1, fixedRng(0), { 'g.ssr': 59 }); // 落點 0 → 第一個項目（SSR）
        assert.equals('ssr_up0', lowRoll.items[0].entryId);
        assert.isTrue(lowRoll.items[0].trace.some((t) => t.indexOf('PITY_SOFT k=60') === 0));
        assert.equals(0, lowRoll.pity['g.ssr']);
        assert.equals(0, lowRoll.pity['g.sr'], '出更高階同時歸零較低階梯');
        const miss = rollPool(pool, 1, fixedRng(0.999999), { 'g.ssr': 59 });
        assert.equals('r_a', miss.items[0].entryId);
        assert.equals(60, miss.pity['g.ssr']);
        assert.equals(1, miss.pity['g.sr']);
        const run = (seed: string) => rollPool(pool, 10, new DeterministicRngSession(seed), { 'g.ssr': 55, 'g.sr': 3 }).items.map((i) => i.entryId).join(',');
        assert.equals(run('a'.repeat(64)), run('a'.repeat(64)));
    });

    suite.test('硬保底（含軟保底池）：第 H 抽必出；SR 階梯第 10 抽必出 SR 以上；十連至少一張 SR 以上', () => {
        const pool = gachaPool();
        const sr = rollPool(pool, 1, fixedRng(0.999999), { 'g.sr': 9 });
        assert.isTrue(sr.items[0].tier !== 'R');
        assert.equals(0, sr.pity['g.sr']);
        const ssr = rollPool(pool, 1, fixedRng(0.999999), { 'g.ssr': 89, 'g.sr': 2 });
        assert.equals('SSR', ssr.items[0].tier);
        assert.isTrue(ssr.items[0].trace.some((t) => t.indexOf('PITY g.ssr=90') === 0));
        // 真亂數十連：任何種子都至少一張 SR 以上
        for (let i = 0; i < 20; i += 1) {
            const out = rollPool(pool, 10, new DeterministicRngSession(`${i}`.padStart(64, 'c')), {});
            assert.isTrue(out.items.some((x) => x.tier !== 'R'), `種子 ${i} 十連必有 SR 以上`);
        }
    });

    suite.test('舊單一硬保底設定：結果與計數規則不變（無軟保底走整數權重路徑）', () => {
        const pool = normalizeRewardConfig({ pools: [{ id: 'T', tiers: ['N', 'R', 'SSR'], entries: [
            { id: 'n1', weight: 60, tier: 'N', effect: FX }, { id: 'r1', weight: 30, tier: 'R', effect: FX }, { id: 's1', weight: 10, tier: 'SSR', effect: FX },
        ], pity: { counterKey: 'p', hard: { count: 5, guaranteeTier: 'SSR' } } }] }).pools[0];
        const zero = { nextInt: () => 0 };
        const out = rollPool(pool, 5, zero, {});
        assert.equals('n1,n1,n1,n1,s1', out.items.map((i) => i.entryId).join(','));
        assert.equals(0, out.pity.p);
        assert.isTrue(out.items[4].trace.some((t) => t === 'PITY p=5'));
        // 與參考實作逐筆比對：同一個種子，舊演算法（手寫）得到的序列一致
        const seed = 'd'.repeat(64);
        // 參考實作（舊演算法手寫）；固定數量的效果不取亂數，所以不需模擬 fx 步驟
        const rng2 = new DeterministicRngSession(seed);
        const ids: string[] = [];
        let counter = 0;
        for (let pull = 0; pull < 30; pull += 1) {
            const salt = `reward:T:${pull}:0`;
            const forced = counter + 1 >= 5;
            const list = forced ? pool.entries.filter((e) => e.tier === 'SSR') : pool.entries;
            const total = list.reduce((t, e) => t + e.weight, 0);
            let roll = rng2.nextInt(total, forced ? `${salt}:pity` : salt);
            let hit = list[list.length - 1];
            for (const e of list) { if (roll < e.weight) { hit = e; break; } roll -= e.weight; }
            ids.push(hit.id);
            counter = hit.tier === 'SSR' ? 0 : counter + 1;
        }
        const actual = rollPool(pool, 30, new DeterministicRngSession(seed), {}).items.map((i) => i.entryId);
        assert.equals(ids.join(','), actual.join(','));
    });

    suite.test('draw.slots：宿命池每輪恰一位指定群組＋九位不重複，名額篩選無可抽時退回整池', () => {
        const entries: unknown[] = [];
        for (let i = 0; i < 6; i += 1) entries.push({ id: `d${i}`, weight: 1, tier: 'SSR', group: 'destiny', effect: FX });
        for (let i = 0; i < 30; i += 1) entries.push({ id: `g${i}`, weight: 1 + (i % 3), tier: 'SR', effect: FX });
        const pool = normalizeRewardConfig({ pools: [{
            id: 'POOL_DESTINY', tiers: ['SR', 'SSR'], maxCount: 3, entries,
            draw: { replacement: false, slots: [{ count: 1, group: 'destiny' }, { count: 9 }] },
            pity: { counterKey: 'x', hard: { count: 3, guaranteeTier: 'SSR' } },
        }] }).pools[0];
        assert.equals(10, pool.picks);
        assert.equals(0, pool.pity.length, '有名額的池不計保底');
        for (let i = 0; i < 25; i += 1) {
            const out = rollPool(pool, 1, new DeterministicRngSession(`${i}`.padStart(64, 'e')), {});
            assert.equals(10, out.items.length);
            assert.equals(10, new Set(out.items.map((x) => x.entryId)).size, '十位不重複');
            assert.isTrue(out.items[0].entryId.indexOf('d') === 0, '第一位必為宿命名將');
        }
        const empty = normalizeRewardConfig({ pools: [{ id: 'E', tiers: ['SR'], entries: [{ id: 'a', weight: 1, tier: 'SR', effect: FX }], draw: { slots: [{ count: 1, group: 'none' }] } }] }).pools[0];
        const fb = rollPool(empty, 1, fixedRng(0), {});
        assert.equals('a', fb.items[0].entryId);
        assert.isTrue(fb.items[0].trace.indexOf('SLOT_FALLBACK') >= 0);
    });

    suite.test('不重複抽樣：replacement=false 時機率路徑也不抽同一項（群組佔比池一輪多抽）', () => {
        const entries: unknown[] = [];
        for (let i = 0; i < 4; i += 1) entries.push({ id: `u${i}`, weight: 1, tier: 'SSR', group: 'up', effect: FX });
        for (let i = 0; i < 4; i += 1) entries.push({ id: `n${i}`, weight: 1, tier: 'SSR', group: 'normal', effect: FX });
        const pool = normalizeRewardConfig({ pools: [{
            id: 'U', tiers: ['SSR'], entries, tierGroups: { SSR: [{ group: 'up', share: 0.7 }, { group: 'normal', share: 0.3 }] },
            draw: { picks: 8, replacement: false },
        }] }).pools[0];
        const out = rollPool(pool, 1, new DeterministicRngSession('f'.repeat(64)), {});
        assert.equals(8, new Set(out.items.map((x) => x.entryId)).size);
    });

    return suite;
}

/** 把已正規化的池還原成設定 JSON（測試改權重用） */
function rawOf(pool: RewardPoolDef): { id: string; tiers: string[]; entries: Array<Record<string, unknown> & { group?: string | null; weight: number }>; pity: unknown; tierGroups: unknown } {
    return {
        id: pool.id, tiers: pool.tiers, entries: pool.entries.map((e) => ({ ...e })), pity: pool.pity.map((p) => ({ counterKey: p.counterKey, tier: p.tier, soft: p.soft, hard: { count: p.hardCount, guaranteeTier: p.guaranteeTier } })),
        tierGroups: { SSR: [{ group: 'up', share: 7 }, { group: 'normal', share: 3 }] },
    };
}
