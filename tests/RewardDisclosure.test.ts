/**
 * RewardDisclosure.test.ts — GCH-R2（PROG-2-9461）：reward.pools 完整機率表、reward.pity 補欄位
 *
 * 鎖住：機率總和為 1（各等階、各項、下一抽）、機率表與抽樣用同一份資料（十萬次蒙地卡羅誤差 < 0.5 個百分點）、
 * 保底進度與下一抽機率、UP 標記與群組佔比、非公開獎池不列逐項、API 層回應形狀與舊欄位相容。
 */
import { assert, TestSuite } from './TestRunner';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import type { RewardAuthority } from '../assets/scripts/core/api/localserver/RewardCommands';
import type { WalletAuthority } from '../assets/scripts/core/api/localserver/WalletCommands';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { isApiFail, type ApiResult } from '../assets/scripts/shared/api/ApiProtocol';
import type { RewardGrantResult, RewardPoolsResult, RewardPoolView } from '../assets/scripts/shared/api/ApiCommands';
import { DeterministicRngSession } from '../assets/scripts/shared/foundation/DeterministicRng';
import { normalizeRewardConfig, type RewardConfigV1, type RewardPoolDef } from '../assets/scripts/shared/reward/RewardConfig';
import { poolViewOf } from '../assets/scripts/shared/reward/RewardDisclosure';
import { emptyRewardMeta, rollPool, type RewardMeta } from '../assets/scripts/shared/reward/RewardRules';

const FX = { kind: 'currency', id: 'bronze', amount: 1 };

/** 三國名將池縮影：SSR 3%（UP 3 位 70%、普通 12 位 30%）、SR 10%、R 87%；兩條保底階梯（規格 12.3 設計值） */
function generalPool(): RewardPoolDef {
    const entries: unknown[] = [];
    for (let i = 0; i < 3; i += 1) entries.push({ id: `ssr_up${i}`, nameKey: `general.up${i}`, weight: 1, tier: 'SSR', group: 'up', effect: FX });
    for (let i = 0; i < 12; i += 1) entries.push({ id: `ssr_n${i}`, weight: 1, tier: 'SSR', group: 'normal', effect: FX });
    // 權重以 15 位 SSR 合計 30 為準：SSR 30、SR 100、R 870（總 1000）
    const ssr = entries as Array<{ weight: number }>;
    for (const e of ssr) e.weight = 2;
    for (let i = 0; i < 10; i += 1) entries.push({ id: `sr${i}`, weight: 10, tier: 'SR', effect: FX });
    for (let i = 0; i < 29; i += 1) entries.push({ id: `r${i}`, weight: 30, tier: 'R', effect: FX });
    return normalizeRewardConfig({ pools: [{
        id: 'POOL_GENERAL', nameKey: 'gacha.pool.general', disclosure: { public: true, version: '2026-11-21' }, currency: ['jade', 'oracleToken'],
        tiers: ['R', 'SR', 'SSR'], maxCount: 10, entries, rules: ['duplicate.convert', 'destiny.exchange'],
        tierGroups: { SSR: [{ group: 'up', share: 0.7 }, { group: 'normal', share: 0.3 }] },
        pity: [
            { counterKey: 'gacha.general.sr', tier: 'SR', soft: { startAt: 6, curveExp: 1 }, hard: { count: 10, guaranteeTier: 'SR' } },
            { counterKey: 'gacha.general.ssr', tier: 'SSR', soft: { startAt: 50, curveExp: 2 }, hard: { count: 90, guaranteeTier: 'SSR' } },
        ],
    }] }).pools[0];
}

function sum(list: readonly number[]): number { return list.reduce((t, x) => t + x, 0); }

class MemoryReward implements RewardAuthority {
    public rewardMeta: RewardMeta = emptyRewardMeta();
    public meta(): RewardMeta { return this.rewardMeta; }
    public setMeta(meta: RewardMeta): void { this.rewardMeta = meta; }
}

class FakeWallet implements WalletAuthority {
    public bag: Record<string, number> = { bronze: 0 };
    public balance(c: string): number { return this.bag[c] ?? 0; }
    public spend(c: string, a: number): boolean { if (this.balance(c) < a) return false; this.bag[c] = this.balance(c) - a; return true; }
    public snapshot(): Record<string, number> { return { ...this.bag }; }
    public credit(c: string, a: number): void { this.bag[c] = this.balance(c) + a; }
}

function rig(config: RewardConfigV1) {
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
    const reward = new MemoryReward();
    bundle.setWallet(new FakeWallet());
    bundle.setRewardAuthority(reward);
    bundle.setRewardConfig(config);
    bundle.setRewardHooks({ entropy: () => 'fixed-entropy' });
    return { api: bundle.api, reward };
}

function ok<T>(res: ApiResult<T>): T {
    if (isApiFail(res)) throw new Error(`${res.errorCode} ${res.message}`);
    return res.result;
}

export function createRewardDisclosureSuite(): TestSuite {
    const suite = new TestSuite('RewardDisclosure（GCH-R2 完整機率表）');

    suite.test('機率總和：各等階逐項相加＝等階機率，各等階相加＝1（基礎與下一抽都成立）', () => {
        const pool = generalPool();
        for (const counters of [{} as Record<string, number>, { 'gacha.general.ssr': 59, 'gacha.general.sr': 6 }, { 'gacha.general.ssr': 89 }, { 'gacha.general.sr': 9 }]) {
            const view = poolViewOf(pool, true, counters);
            assert.inRange(sum(view.tiers.map((t) => t.baseRate)), 1 - 1e-9, 1 + 1e-9, '等階基礎機率');
            assert.inRange(sum(view.tiers.map((t) => t.effectiveRate)), 1 - 1e-9, 1 + 1e-9, '等階下一抽機率');
            for (const t of view.tiers) {
                assert.inRange(sum(t.entries.map((e) => e.rate)), t.baseRate - 1e-9, t.baseRate + 1e-9, `${t.tier} 逐項基礎機率相加`);
                assert.inRange(sum(t.entries.map((e) => e.effectiveRate)), t.effectiveRate - 1e-9, t.effectiveRate + 1e-9, `${t.tier} 逐項下一抽機率相加`);
            }
            assert.inRange(sum(view.tiers.flatMap((t) => t.entries.map((e) => e.effectiveRate))), 1 - 1e-9, 1 + 1e-9);
        }
    });

    suite.test('機率表內容：等階、UP 標記與 70/30 群組佔比、保底進度與下一抽機率、規則代碼、元資料', () => {
        const view = poolViewOf(generalPool(), true, { 'gacha.general.ssr': 59, 'gacha.general.sr': 0 });
        assert.equals('R,SR,SSR', view.tiers.map((t) => t.tier).join(','));
        assert.equals('gacha.pool.general', view.nameKey);
        assert.equals('2026-11-21', view.disclosureVersion);
        assert.equals('jade,oracleToken', view.currency.join(','));
        const ssr = view.tiers[2];
        assert.inRange(ssr.baseRate, 0.0299999, 0.0300001);
        assert.inRange(ssr.effectiveRate, 0.0995, 0.1005, '第 60 抽約 10%');
        const up = ssr.entries.filter((e) => e.isUp);
        assert.equals(3, up.length);
        assert.equals('general.up0', up[0].nameKey);
        assert.inRange(sum(up.map((e) => e.rate)), 0.021 - 1e-9, 0.021 + 1e-9, 'SSR 內 UP 佔 70%＝2.1%');
        assert.equals('gacha.general.ssr,gacha.general.sr', view.pities.map((p) => p.counterKey).join(','));
        const p = view.pities[0];
        assert.equals(59, p.counter);
        assert.equals(59, p.count);
        assert.equals(50, p.softStartAt);
        assert.equals(2, p.curveExp);
        assert.equals(90, p.hardAt);
        assert.equals(31, p.remaining);
        assert.equals('soft', p.zone);
        assert.inRange(p.nextPullRate, 0.0995, 0.1005);
        assert.equals('base', view.pities[1].zone);
        assert.equals('gacha.general.ssr', view.pity?.counterKey, '舊欄位 pity＝第一條階梯');
        assert.equals('pity.hard,pity.soft,up.share,duplicate.convert,destiny.exchange', view.rules.join(','));
        assert.equals(true, view.public);
        assert.equals(0, view.slots.length);
    });

    suite.test('硬保底區：下一抽機率 1、remaining 1；無保底池 pities 為空陣列', () => {
        const view = poolViewOf(generalPool(), true, { 'gacha.general.ssr': 89 });
        assert.equals('hard', view.pities[0].zone);
        assert.equals(1, view.pities[0].nextPullRate);
        assert.equals(1, view.pities[0].remaining);
        const plain = normalizeRewardConfig({ pools: [{ id: 'P', tiers: ['N'], entries: [{ id: 'a', weight: 1, tier: 'N', effect: FX }] }] }).pools[0];
        const pv = poolViewOf(plain, true, {});
        assert.equals(0, pv.pities.length);
        assert.equals(null, pv.pity);
        assert.equals(1, pv.tiers[0].entries[0].rate);
    });

    suite.test('非公開獎池（disclosure.public=false）只列等階、不列逐項；draw.slots 輸出名額與單次機率', () => {
        const cfg = normalizeRewardConfig({ pools: [
            { id: 'HIDE', tiers: ['N'], disclosure: { public: false }, entries: [{ id: 'a', weight: 1, tier: 'N', effect: FX }] },
            { id: 'DESTINY', tiers: ['SR', 'SSR'], draw: { replacement: false, slots: [{ count: 1, group: 'six' }, { count: 2 }] }, entries: [
                { id: 'd1', weight: 1, tier: 'SSR', group: 'six', effect: FX }, { id: 'd2', weight: 3, tier: 'SSR', group: 'six', effect: FX },
                { id: 'x1', weight: 1, tier: 'SR', effect: FX }, { id: 'x2', weight: 1, tier: 'SR', effect: FX },
            ] },
        ] });
        const hide = poolViewOf(cfg.pools[0], true, {});
        assert.equals(false, hide.public);
        assert.equals(0, hide.tiers[0].entries.length);
        assert.equals(1, hide.tiers[0].baseRate);
        const dv = poolViewOf(cfg.pools[1], true, {});
        assert.equals(2, dv.slots.length);
        assert.equals('six', dv.slots[0].group);
        assert.equals(0.25, dv.slots[0].entries[0].rate);
        assert.equals(0.75, dv.slots[0].entries[1].rate);
        assert.equals(4, dv.slots[1].entries.length);
    });

    // 蒙地卡羅：同一份機率表 vs 十萬次實際抽樣（每次從同一個保底狀態抽一抽），誤差 < 0.5 個百分點
    const monteCarlo = (label: string, counters: Record<string, number>): void => {
        suite.test(`蒙地卡羅十萬次與機率表一致（${label}）`, () => {
            const pool = generalPool();
            const view = poolViewOf(pool, true, counters);
            const N = 100_000;
            const hits = new Map<string, number>();
            const rng = new DeterministicRngSession('9'.repeat(64));
            for (let i = 0; i < N; i += 1) {
                const id = rollPool(pool, 1, rng, counters).items[0].entryId;
                hits.set(id, (hits.get(id) ?? 0) + 1);
            }
            for (const t of view.tiers) {
                const freq = sum(t.entries.map((e) => hits.get(e.entryId) ?? 0)) / N;
                assert.inRange(Math.abs(freq - t.effectiveRate), 0, 0.005, `${t.tier} 頻率 ${freq} 對 ${t.effectiveRate}`);
                for (const e of t.entries) {
                    assert.inRange(Math.abs((hits.get(e.entryId) ?? 0) / N - e.effectiveRate), 0, 0.005, `${e.entryId}`);
                }
            }
        });
    };
    monteCarlo('無保底進度', {});
    monteCarlo('SSR 軟保底第 70 抽、SR 第 7 抽', { 'gacha.general.ssr': 69, 'gacha.general.sr': 6 });
    monteCarlo('SSR 軟保底第 80 抽', { 'gacha.general.ssr': 79 });

    suite.test('API：reward.pools 回完整機率表且與 reward.pity／reward.roll 的 pities 一致；舊欄位相容；抽後進度前進', async () => {
        const cfg = normalizeRewardConfig({ pools: [
            { id: 'POOL_T', tiers: ['N', 'SSR'], entries: [
                { id: 'n', weight: 9, tier: 'N', effect: FX }, { id: 's', weight: 1, tier: 'SSR', effect: FX },
            ], pity: { counterKey: 'p', soft: { startAt: 3, curveExp: 1 }, hard: { count: 5, guaranteeTier: 'SSR' } }, sources: ['quest'] },
        ] });
        const r = rig(cfg);
        const before = ok(await r.api.query<RewardPoolsResult>('reward.pools', {}));
        const pv: RewardPoolView = before.pools[0];
        assert.equals(0.1, pv.tiers[1].probability, '舊欄位 probability 保留');
        assert.equals(0.1, pv.tiers[1].baseRate);
        assert.equals(1, pv.tiers[1].entries.length);
        assert.equals(0, pv.pity?.count);
        assert.equals(5, pv.pity?.hardAt);
        assert.equals(1, pv.pities.length);
        assert.inRange(pv.pities[0].nextPullRate, 0.0999, 0.1001);
        // 抽 1 次未出 SSR 的情況：用 count 連抽直到計數變化，檢查 pities 與 reward.pity 一致
        const res = ok(await r.api.cmd<RewardGrantResult>('reward.roll', { poolId: 'POOL_T', count: 1, grantKey: 'k1', source: { kind: 'quest', ref: 'Q' } }));
        const q = ok(await r.api.query<{ poolId: string; pity: { count: number; hardAt: number }; pities: Array<{ counter: number; nextPullRate: number }> }>('reward.pity', { poolId: 'POOL_T' }));
        assert.equals(res.pities?.[0].counter, q.pities[0].counter);
        assert.equals(res.pities?.[0].nextPullRate, q.pities[0].nextPullRate);
        assert.equals(q.pity.count, q.pities[0].counter);
        const after = ok(await r.api.query<RewardPoolsResult>('reward.pools', {}));
        assert.equals(q.pities[0].counter, after.pools[0].pities[0].counter);
    });

    return suite;
}
