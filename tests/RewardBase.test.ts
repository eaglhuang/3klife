/**
 * RewardBase.test.ts — 獎勵 base MVP：獎池、保底、固定套件與懲罰、reward.roll／claim、演出 adapter（PROG-2-9205；doc_spec_1186、doc_spec_1182 §12 RWD-M）
 *
 * 鎖住：設定正規化、同種子同結果、保底必出與歸零、冪等（同 grantKey 回原結果不前進亂數）、亂數會話持久化、
 * 入帳走物品庫存命令層、整筆回滾、懲罰截斷與上限、倍率縮放、宿主自訂效果（技能）、錯誤碼 E32x、
 * 演出缺實作退回 instant、以及真的 GameSession 存檔往返與舊檔缺值。
 *
 * Unity 對照：像 LootTable 的 EditMode 契約測試加一條「存檔讀檔後保底不歸零」的整合測試。
 */
import { assert, TestSuite } from './TestRunner';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import type { ItemAuthority, StockTable } from '../assets/scripts/core/api/localserver/ItemCommands';
import type { RewardAuthority } from '../assets/scripts/core/api/localserver/RewardCommands';
import type { WalletAuthority } from '../assets/scripts/core/api/localserver/WalletCommands';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { isApiFail, type ApiResult } from '../assets/scripts/shared/api/ApiProtocol';
import type { RewardGrantResult, RewardPoolsResult } from '../assets/scripts/shared/api/ApiCommands';
import { DeterministicRngSession } from '../assets/scripts/shared/foundation/DeterministicRng';
import { DEFAULT_ITEM_CONFIG, type HolderRef } from '../assets/scripts/shared/item/ItemConfig';
import { emptyItemMeta, type ItemMeta } from '../assets/scripts/shared/item/ItemRules';
import { normalizeRewardConfig, type RewardConfigV1 } from '../assets/scripts/shared/reward/RewardConfig';
import {
    PresentationRegistry, presentGrant, registerBuiltinPresentations, type GrantPresentationRequest, type GrantPresentationSink,
} from '../assets/scripts/shared/reward/RewardPresentation';
import {
    capLoss, emptyRewardMeta, isEmptyRewardMeta, normalizeRewardMeta, REWARD_GRANT_LIMIT, rollPool, scaleEffect, tierProbabilities,
    type RewardMeta,
} from '../assets/scripts/shared/reward/RewardRules';

const SEED = 'a'.repeat(64);

class FakeWallet implements WalletAuthority {
    public bag: Record<string, number> = { bronze: 100, gold: 0 };
    public balance(currency: string): number { return this.bag[currency] ?? 0; }
    public spend(currency: string, amount: number): boolean {
        if (this.balance(currency) < amount) return false;
        this.bag[currency] = this.balance(currency) - amount;
        return true;
    }
    public snapshot(): Record<string, number> { return { ...this.bag }; }
    public credit(currency: string, amount: number): void { this.bag[currency] = this.balance(currency) + amount; }
}

class MemoryItems implements ItemAuthority {
    public stock: Record<string, number> = {};
    public itemMeta: ItemMeta = emptyItemMeta();
    public read(holder: HolderRef, container: string): StockTable | null { return holder.kind === 'household' && container === 'main' ? { ...this.stock } : null; }
    public write(_h: HolderRef, _c: string, next: StockTable): void { this.stock = { ...next }; }
    public meta(): ItemMeta { return this.itemMeta; }
    public setMeta(meta: ItemMeta): void { this.itemMeta = meta; }
}

class MemoryReward implements RewardAuthority {
    public rewardMeta: RewardMeta = emptyRewardMeta();
    public meta(): RewardMeta { return this.rewardMeta; }
    public setMeta(meta: RewardMeta): void { this.rewardMeta = meta; }
}

/** 一個三等階的獎池：N 銅錢區間、R 道具、SSR 道具（權重 10），第 5 抽起保底 SSR */
function testConfig(): RewardConfigV1 {
    return normalizeRewardConfig({
        pools: [
            {
                id: 'POOL_T', tiers: ['N', 'R', 'SSR'], maxCount: 10,
                entries: [
                    { id: 'n1', weight: 60, tier: 'N', effect: { kind: 'currency', id: 'bronze', amount: { min: 10, max: 20 } } },
                    { id: 'r1', weight: 30, tier: 'R', effect: { kind: 'item', itemId: 'ITEM_R', qty: 1 } },
                    { id: 's1', weight: 10, tier: 'SSR', effect: { kind: 'item', itemId: 'ITEM_SSR', qty: 1 } },
                ],
                pity: { counterKey: 'pity.t', hard: { count: 5, guaranteeTier: 'SSR' } },
                sources: ['quest'],
                presentation: { type: 'chest', args: { skin: 'wood' }, skippable: true },
            },
            { id: 'POOL_OFF', enabled: false, entries: [{ id: 'x', weight: 1, effect: { kind: 'currency', id: 'bronze', amount: 1 } }] },
            { id: 'POOL_COND', condition: { kind: 'const', value: false }, entries: [{ id: 'x', weight: 1, effect: { kind: 'currency', id: 'bronze', amount: 1 } }] },
            { id: 'POOL_BAD_CUR', entries: [{ id: 'x', weight: 1, effect: { kind: 'currency', id: 'nope', amount: 1 } }] },
            { id: 'POOL_SKILL', entries: [{ id: 'k', weight: 1, effect: { kind: 'tacticLearn', tacticId: 'T1' } }] },
            { id: 'POOL_FULL', entries: [{ id: 'a', weight: 1, effect: { kind: 'item', itemId: 'ITEM_CAP', qty: 5 } }] },
        ],
        bundles: [
            {
                id: 'BUNDLE_FAMINE', kind: 'penalty', cap: { maxLoss: { bronze: 150 } },
                effects: [{ kind: 'currency', id: 'bronze', amount: -500 }, { kind: 'item', itemId: 'ITEM_R', qty: -3 }],
            },
            { id: 'BUNDLE_GIFT', effects: [{ kind: 'currency', id: 'bronze', amount: 50 }, { kind: 'item', itemId: 'ITEM_R', qty: 2 }] },
            { id: 'BUNDLE_MIX', effects: [{ kind: 'currency', id: 'bronze', amount: 50 }, { kind: 'item', itemId: 'ITEM_CAP', qty: 9 }] },
            { id: 'BUNDLE_SKILL', effects: [{ kind: 'tacticLearn', tacticId: 'T9' }] },
            { id: 'BUNDLE_NOHANDLER', effects: [{ kind: 'mystery', x: 1 }] },
        ],
    });
}

function rig(config: RewardConfigV1 = testConfig()) {
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
    const wallet = new FakeWallet();
    const items = new MemoryItems();
    const reward = new MemoryReward();
    bundle.setWallet(wallet);
    bundle.setItemAuthority(items);
    bundle.setRewardAuthority(reward);
    bundle.setRewardConfig(config);
    bundle.setRewardHooks({ entropy: () => 'fixed-entropy' });
    return { api: bundle.api, bundle, wallet, items, reward };
}

type Rig = ReturnType<typeof rig>;

async function roll(r: Rig, key: string, extra: Record<string, unknown> = {}): Promise<ApiResult<RewardGrantResult>> {
    return r.api.cmd<RewardGrantResult>('reward.roll', { poolId: 'POOL_T', grantKey: key, source: { kind: 'quest', ref: 'Q1' }, ...extra });
}

function ok<T>(res: ApiResult<T>): T {
    if (isApiFail(res)) throw new Error(`${res.errorCode} ${res.message}`);
    return res.result;
}

function errorOf(res: ApiResult<unknown>): string {
    return isApiFail(res) ? res.errorCode : 'OK';
}

const FAKE_SINK_CALLS: string[] = [];
const sink: GrantPresentationSink = {
    showRewardList: async (req: GrantPresentationRequest) => { FAKE_SINK_CALLS.push(`list:${req.grantId}:${req.lines.length}`); },
    showChest: async (req: GrantPresentationRequest, skin: string) => { FAKE_SINK_CALLS.push(`chest:${req.grantId}:${skin}`); },
};

export function createRewardBaseSuite(): TestSuite {
    const suite = new TestSuite('RewardBase (獎勵 base MVP：獎池、保底、套件、reward.roll／claim PROG-2-9205)');

    suite.test('設定正規化：壞條目被丟、區間與保底欄位合法才留、非物件回空設定', () => {
        assert.equals(0, normalizeRewardConfig(null).pools.length);
        const cfg = normalizeRewardConfig({
            pools: [
                { id: '' }, { id: 'P', entries: [] },
                { id: 'Q', tiers: ['N'], entries: [{ id: 'a', weight: -1, effect: { kind: 'currency', id: 'gold', amount: 1 } }, { id: 'b', weight: 1, effect: { kind: 'currency', id: 'gold', amount: { min: 5, max: 1 } } }, { id: 'c', weight: 1, effect: { kind: 'currency', id: 'gold', amount: 3 } }], pity: { counterKey: 'k', hard: { count: 3, guaranteeTier: 'NOPE' } } },
            ],
            bundles: [{ id: 'B', effects: [{ kind: 'item', itemId: '', qty: 1 }] }, { id: 'B2', effects: [{ kind: 'fame', amount: -3 }] }],
        });
        assert.equals(1, cfg.pools.length);
        assert.equals(1, cfg.pools[0].entries.length, '只留下合法的 c');
        assert.equals(0, cfg.pools[0].pity.length, '保底等階不在 tiers 內就丟掉保底');
        assert.equals(1, cfg.bundles.length);
        assert.equals('B2', cfg.bundles[0].id);
    });

    suite.test('機率公開：各等階命中機率加總為 1', () => {
        const pool = testConfig().pools[0];
        const probs = tierProbabilities(pool);
        assert.equals('N,R,SSR', probs.map((p) => p.tier).join(','));
        assert.inRange(probs.reduce((s, p) => s + p.probability, 0), 0.999999, 1.000001);
        assert.inRange(probs[2].probability, 0.099, 0.101);
    });

    suite.test('同種子同保底計數必得同一結果；不同種子結果不同', () => {
        const pool = testConfig().pools[0];
        const run = (seed: string) => rollPool(pool, 8, new DeterministicRngSession(seed), {}).items.map((i) => `${i.entryId}:${JSON.stringify(i.effect)}`).join('|');
        assert.equals(run(SEED), run(SEED));
        assert.isTrue(run(SEED) !== run('b'.repeat(64)));
    });

    suite.test('保底：第 5 抽起必出 SSR 並歸零；自然出 SSR 也歸零；共用 counterKey 的獎池共用計數', () => {
        const pool = testConfig().pools[0];
        // 全 N 的假亂數（rng 永遠回 0 → 第一個項目 n1），第 5 抽必被保底改成 SSR
        const zero = { nextInt: () => 0 };
        const out = rollPool(pool, 5, zero, {});
        assert.equals('n1,n1,n1,n1,s1', out.items.map((i) => i.entryId).join(','));
        assert.equals(0, out.pity['pity.t']);
        assert.isTrue(out.items[4].trace.some((t) => t.indexOf('PITY') === 0));
        // 已累積 4 抽，單抽即觸發
        assert.equals('s1', rollPool(pool, 1, zero, { 'pity.t': 4 }).items[0].entryId);
        // 沒到門檻：計數 +1
        assert.equals(3, rollPool(pool, 1, zero, { 'pity.t': 2 }).pity['pity.t']);
        // 另一個池共用同一 counterKey：計數互通
        const other = { ...pool, id: 'POOL_T2' };
        const mid = rollPool(pool, 3, zero, {});
        assert.equals('s1', rollPool(other, 2, zero, mid.pity).items[1].entryId);
    });

    suite.test('縮放與上限：reward 乘正向、risk 乘負向，非零至少保留 1；懲罰截到 cap', () => {
        assert.equals(20, scaleEffect({ kind: 'currency', id: 'gold', amount: 10 }, { reward: 2 }).effect.amount);
        assert.equals(-15, scaleEffect({ kind: 'currency', id: 'gold', amount: -10 }, { reward: 2, risk: 1.5 }).effect.amount);
        assert.equals(1, scaleEffect({ kind: 'item', itemId: 'X', qty: 1 }, { reward: 0.1 }).effect.qty);
        assert.equals(null, scaleEffect({ kind: 'currency', id: 'gold', amount: 10 }, {}).trace);
        const capped = capLoss({ kind: 'currency', id: 'bronze', amount: -500 }, { cap: { maxLoss: { bronze: 150 } } });
        assert.equals(-150, capped.effect.amount);
        assert.isTrue(capped.trace !== null);
        assert.equals(-40, capLoss({ kind: 'currency', id: 'bronze', amount: -40 }, { cap: { maxLoss: { bronze: 150 } } }).effect.amount);
    });

    suite.test('reward.roll：抽中的道具經 item.grant 入帳（帳本來源 REWARD）、貨幣入錢包、回應不含種子', async () => {
        const r = rig();
        const res = ok(await roll(r, 'k1', { count: 5 }));
        assert.equals(5, res.plan.length);
        assert.isTrue(res.settled);
        assert.equals('chest', res.presentation.type);
        assert.equals(false, res.replayed);
        assert.isFalse(JSON.stringify(res).indexOf(SEED) >= 0 || /seedHex|stepIndex/.test(JSON.stringify(res)), '種子與步數不下發');
        const items = res.plan.filter((l) => l.applied.kind === 'item');
        for (const line of items) assert.isTrue((r.items.stock[String(line.applied.itemId)] ?? 0) >= 1);
        const bronzeGain = res.plan.filter((l) => l.applied.kind === 'currency').reduce((s, l) => s + Number(l.applied.amount), 0);
        assert.equals(100 + bronzeGain, r.wallet.balance('bronze'));
        const ledger = r.items.meta().ledger;
        assert.equals(items.length, ledger.length);
        assert.isTrue(ledger.every((e) => e.reason === 'REWARD'));
        assert.equals(res.pity?.hardAt, 5);
    });

    suite.test('冪等：同 grantKey 重送回原結果（replayed）、不再入帳、不前進亂數與保底；不同 idemKey 也一樣', async () => {
        const r = rig();
        const first = ok(await roll(r, 'once', { count: 3 }));
        const metaAfter = JSON.stringify(r.reward.meta());
        const stockAfter = JSON.stringify(r.items.stock);
        const walletAfter = r.wallet.balance('bronze');
        const again = ok(await roll(r, 'once', { count: 3 }));
        assert.equals(true, again.replayed);
        assert.equals(JSON.stringify(first.plan), JSON.stringify(again.plan));
        assert.equals(first.grantId, again.grantId);
        assert.equals(metaAfter, JSON.stringify(r.reward.meta()));
        assert.equals(stockAfter, JSON.stringify(r.items.stock));
        assert.equals(walletAfter, r.wallet.balance('bronze'));
        // 鍵被別的獎池用過 → E327
        assert.equals('E327', errorOf(await r.api.cmd('reward.claim', { bundleId: 'BUNDLE_GIFT', grantKey: 'once', source: { kind: 'quest' } })));
    });

    suite.test('亂數會話持久化：換一個新 adapter 載入同一份 meta，接續出的結果與不中斷連抽完全相同（防 SL）', async () => {
        const straight = rig();
        const a = ok(await roll(straight, 'a'));
        const b = ok(await roll(straight, 'b'));
        const split = rig();
        const a2 = ok(await roll(split, 'a'));
        // 模擬存檔讀檔：meta 經 JSON 往返，新的 adapter／錢包／庫存從 0 接手（只驗證 plan，不驗證帳）
        const resumed = rig();
        resumed.reward.setMeta(normalizeRewardMeta(JSON.parse(JSON.stringify(split.reward.meta()))));
        const b2 = ok(await roll(resumed, 'b'));
        assert.equals(JSON.stringify(a.plan), JSON.stringify(a2.plan));
        assert.equals(JSON.stringify(b.plan), JSON.stringify(b2.plan));
    });

    suite.test('保底計數持久化：連抽累積進 reward.pity；保底等階無可抽項目時退回普通抽，不卡玩家', async () => {
        const r = rig();
        r.bundle.setRewardConfig(normalizeRewardConfig({
            pools: [{
                id: 'POOL_T', tiers: ['N', 'SSR'],
                entries: [{ id: 'n', weight: 100, tier: 'N', effect: { kind: 'currency', id: 'bronze', amount: 1 } }, { id: 's', weight: 0, tier: 'SSR', effect: { kind: 'item', itemId: 'ITEM_SSR', qty: 1 } }],
                pity: { counterKey: 'p', hard: { count: 3, guaranteeTier: 'SSR' } },
            }],
        }));
        // SSR 權重 0：普通抽不會中；保底抽時 eligible 總權重為 0 → 退回普通抽（設定錯誤不卡玩家）
        const res = ok(await roll(r, 'x', { count: 4 }));
        assert.equals(4, res.plan.length);
        assert.isTrue(res.plan.every((l) => l.entryId === 'n'));
        const pity = ok(await r.api.query<{ poolId: string; pity: { count: number; hardAt: number } }>('reward.pity', { poolId: 'POOL_T' }));
        assert.equals(4, pity.pity.count);
        assert.equals(3, pity.pity.hardAt);
    });

    suite.test('reward.pools：回開放狀態、各等階機率與保底進度；條件／停用的池為未開放', async () => {
        const r = rig();
        ok(await roll(r, 'p1', { count: 2 }));
        const view = ok(await r.api.query<RewardPoolsResult>('reward.pools', {}));
        const t = view.pools.find((p) => p.poolId === 'POOL_T');
        assert.isTrue(t?.open === true);
        assert.equals(2, t?.pity?.count);
        assert.equals(false, view.pools.find((p) => p.poolId === 'POOL_OFF')?.open);
        assert.equals(false, view.pools.find((p) => p.poolId === 'POOL_COND')?.open);
        r.bundle.setRewardHooks({ evaluate: () => true });
        const again = ok(await r.api.query<RewardPoolsResult>('reward.pools', {}));
        assert.equals(true, again.pools.find((p) => p.poolId === 'POOL_COND')?.open);
    });

    suite.test('reward.claim 固定套件：入帳、冪等重送回原結果', async () => {
        const r = rig();
        r.items.stock = { ITEM_R: 1 };
        const first = ok(await r.api.cmd<RewardGrantResult>('reward.claim', { bundleId: 'BUNDLE_GIFT', grantKey: 'g1', source: { kind: 'mission' } }));
        assert.equals(150, r.wallet.balance('bronze'));
        assert.equals(3, r.items.stock.ITEM_R);
        const again = ok(await r.api.cmd<RewardGrantResult>('reward.claim', { bundleId: 'BUNDLE_GIFT', grantKey: 'g1', source: { kind: 'mission' } }));
        assert.equals(true, again.replayed);
        assert.equals(first.grantId, again.grantId);
        assert.equals(150, r.wallet.balance('bronze'));
        assert.equals(3, r.items.stock.ITEM_R);
    });

    suite.test('懲罰：套件上限截斷、餘額不足截到餘額、物品有多少扣多少，全部記 trace，不會扣成負數', async () => {
        const r = rig();
        r.items.stock = { ITEM_R: 2 };
        r.wallet.bag.bronze = 100;
        const res = ok(await r.api.cmd<RewardGrantResult>('reward.claim', { bundleId: 'BUNDLE_FAMINE', grantKey: 'f1', source: { kind: 'mission' } }));
        // cap 150 先截 -500→-150，再被餘額 100 截到 -100
        assert.equals(-100, res.plan[0].applied.amount);
        assert.isTrue(res.plan[0].trace.some((t) => t.indexOf('CAPPED') === 0));
        assert.isTrue(res.plan[0].trace.some((t) => t.indexOf('TRUNCATED') === 0));
        assert.equals(0, r.wallet.balance('bronze'));
        assert.equals(-2, res.plan[1].applied.qty);
        assert.equals(0, r.items.stock.ITEM_R ?? 0);
        // 沒有東西可扣的物品懲罰仍成功，量為 0
        const empty = ok(await r.api.cmd<RewardGrantResult>('reward.claim', { bundleId: 'BUNDLE_FAMINE', grantKey: 'f2', source: { kind: 'mission' } }));
        assert.equals(0, empty.plan[0].applied.amount);
        assert.equals(0, empty.plan[1].applied.qty);
    });

    suite.test('倍率縮放：宿主提供 riskMul／rewardMul，客戶端不能傳', async () => {
        const r = rig();
        r.bundle.setRewardHooks({ modifiers: () => ({ reward: 2, risk: 0.5 }) });
        r.wallet.bag.bronze = 1000;
        const gift = ok(await r.api.cmd<RewardGrantResult>('reward.claim', { bundleId: 'BUNDLE_GIFT', grantKey: 'm1', source: { kind: 'mission' } }));
        assert.equals(100, gift.plan[0].applied.amount);
        const loss = ok(await r.api.cmd<RewardGrantResult>('reward.claim', { bundleId: 'BUNDLE_FAMINE', grantKey: 'm2', source: { kind: 'mission' } }));
        assert.equals(-150, loss.plan[0].applied.amount, '-500 先 ×0.5=-250，再被套件上限截到 -150');
    });

    suite.test('整筆回滾：後面的效果入帳失敗（道具滿了），前面已入帳的貨幣被撤銷，亂數與保底不前進', async () => {
        const r = rig();
        r.bundle.setItemConfig({
            ...DEFAULT_ITEM_CONFIG,
            items: [...DEFAULT_ITEM_CONFIG.items, { id: 'ITEM_CAP', kind: 'consumable', stack: { mode: 'stackable', max: 2 }, bind: 'none', overflow: null }],
        });
        const before = JSON.stringify(r.reward.meta());
        const res = await r.api.cmd('reward.claim', { bundleId: 'BUNDLE_MIX', grantKey: 'bad', source: { kind: 'mission' } });
        assert.equals('E325', errorOf(res));
        assert.equals(100, r.wallet.balance('bronze'), '貨幣已撤銷');
        assert.equals(before, JSON.stringify(r.reward.meta()), '失敗不寫發放紀錄、不前進');
        // 失敗的 grantKey 可以重試（沒有被記成已領）
        r.bundle.setItemConfig(DEFAULT_ITEM_CONFIG);
        assert.equals('OK', errorOf(await r.api.cmd('reward.claim', { bundleId: 'BUNDLE_MIX', grantKey: 'bad', source: { kind: 'mission' } })));
        // 獎池版：保底計數與亂數步數同樣不前進
        const r2 = rig();
        r2.bundle.setItemConfig({ ...DEFAULT_ITEM_CONFIG, items: [{ id: 'ITEM_CAP', kind: 'consumable', stack: { mode: 'stackable', max: 2 }, bind: 'none', overflow: null }] });
        const snapshot = JSON.stringify(r2.reward.meta());
        assert.equals('E325', errorOf(await r2.api.cmd('reward.roll', { poolId: 'POOL_FULL', grantKey: 'full', source: { kind: 'quest' } })));
        assert.equals(snapshot, JSON.stringify(r2.reward.meta()));
    });

    suite.test('宿主自訂效果（技能習得等）用 registerRewardEffect 掛 handler；沒掛就 E326，不動任何帳', async () => {
        const r = rig();
        assert.equals('E326', errorOf(await r.api.cmd('reward.claim', { bundleId: 'BUNDLE_SKILL', grantKey: 's0', source: { kind: 'story' } })));
        assert.equals('E326', errorOf(await r.api.cmd('reward.claim', { bundleId: 'BUNDLE_NOHANDLER', grantKey: 's00', source: { kind: 'story' } })));
        const learned: string[] = [];
        r.bundle.registerRewardEffect('tacticLearn', (effect) => { learned.push(String(effect.tacticId)); return { applied: effect }; });
        const res = ok(await r.api.cmd<RewardGrantResult>('reward.claim', { bundleId: 'BUNDLE_SKILL', grantKey: 's1', source: { kind: 'story' } }));
        assert.equals('T9', learned.join(','));
        assert.equals('tacticLearn', res.plan[0].applied.kind);
    });

    suite.test('錯誤碼 E32x：找不到池／套件、未開放、無憑證、數量非法、未知幣別', async () => {
        const r = rig();
        assert.equals('E320', errorOf(await r.api.cmd('reward.roll', { poolId: 'NOPE', grantKey: 'a', source: { kind: 'quest' } })));
        assert.equals('E321', errorOf(await r.api.cmd('reward.claim', { bundleId: 'NOPE', grantKey: 'a', source: { kind: 'quest' } })));
        assert.equals('E322', errorOf(await r.api.cmd('reward.roll', { poolId: 'POOL_OFF', grantKey: 'a', source: { kind: 'quest' } })));
        assert.equals('E322', errorOf(await r.api.cmd('reward.roll', { poolId: 'POOL_COND', grantKey: 'a2', source: { kind: 'quest' } })));
        assert.equals('E323', errorOf(await r.api.cmd('reward.roll', { poolId: 'POOL_T', grantKey: 'a3', source: { kind: 'shop' } })));
        assert.equals('E324', errorOf(await roll(r, 'c0', { count: 0 })));
        assert.equals('E324', errorOf(await roll(r, 'c11', { count: 11 })));
        assert.equals('E324', errorOf(await roll(r, 'c15', { count: 1.5 })));
        assert.equals('E302', errorOf(await r.api.cmd('reward.roll', { poolId: 'POOL_BAD_CUR', grantKey: 'cur', source: { kind: 'quest' } })));
        assert.equals('E001', errorOf(await r.api.cmd('reward.roll', { poolId: 'POOL_T', source: { kind: 'quest' } })));
        assert.equals('E001', errorOf(await r.api.cmd('reward.roll', { poolId: 'POOL_T', grantKey: 'a4', source: 'quest' })));
        assert.equals('E103', errorOf(await r.api.cmd('reward.roll', { poolId: 'POOL_T', grantKey: 'a5', source: { kind: 'quest' }, plan: [] })));
        assert.equals('E103', errorOf(await r.api.cmd('reward.claim', { bundleId: 'BUNDLE_GIFT', grantKey: 'a6', source: { kind: 'quest' }, qty: 999 })));
        const unbound = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()));
        unbound.setRewardConfig(testConfig());
        assert.equals('E328', errorOf(await unbound.api.cmd('reward.roll', { poolId: 'POOL_T', grantKey: 'a', source: { kind: 'quest' } })));
    });

    suite.test('發放紀錄只保留最近 REWARD_GRANT_LIMIT 筆；meta 正規化濾掉壞資料、空 meta 不寫入存檔', () => {
        assert.isTrue(isEmptyRewardMeta(emptyRewardMeta()));
        assert.isTrue(isEmptyRewardMeta(normalizeRewardMeta(null)));
        const many = Array.from({ length: REWARD_GRANT_LIMIT + 5 }, (_, i) => ({ key: `k${i}`, kind: 'pool', refId: 'P', result: {} }));
        const meta = normalizeRewardMeta({ v: 1, seq: 9, rng: { seedHex: SEED, stepIndex: 3 }, pity: { a: 2, b: -1, c: 'x' }, grants: [...many, { key: 5 }, null] });
        assert.equals(REWARD_GRANT_LIMIT, meta.grants.length);
        assert.equals('k5', meta.grants[0].key);
        assert.equals('a', Object.keys(meta.pity).join(','));
        assert.equals(3, meta.rng?.stepIndex);
        assert.equals(null, normalizeRewardMeta({ rng: { seedHex: 'short', stepIndex: 1 } }).rng);
        assert.isFalse(isEmptyRewardMeta(meta));
    });

    suite.test('演出 adapter：instant／chest 內建；未註冊的類型退回 instant，連 instant 都沒有也只記 log，不拋錯', async () => {
        const registry = new PresentationRegistry();
        const logs: string[] = [];
        const result = { grantId: 'gr_1', plan: [], presentation: { type: 'treasureMap', args: {}, skippable: true } };
        await presentGrant(result, registry, { log: (m) => logs.push(m) });
        assert.equals(2, logs.length, '兩層退回都有記 log');
        registerBuiltinPresentations(registry, sink);
        FAKE_SINK_CALLS.length = 0;
        await presentGrant(result, registry, { log: (m) => logs.push(m) });
        await presentGrant({ ...result, presentation: { type: 'chest', args: { skin: 'gold' }, skippable: true } }, registry);
        await presentGrant({ ...result, presentation: { type: 'chest', args: {}, skippable: true } }, registry, { override: 'instant' });
        assert.equals('list:gr_1:0,chest:gr_1:gold,list:gr_1:0', FAKE_SINK_CALLS.join(','));
        // 新演出只需 register 一個模組
        let played = '';
        registry.register('treasureMap', { play: async (req) => { played = req.type; } });
        await presentGrant(result, registry);
        assert.equals('treasureMap', played);
        // 演出拋錯不影響呼叫端（帳目早已入帳）
        registry.register('dice', { play: async () => { throw new Error('boom'); } });
        await presentGrant({ ...result, presentation: { type: 'dice', args: {}, skippable: true } }, registry, { log: (m) => logs.push(m) });
        assert.isTrue(logs.some((m) => m.indexOf('boom') >= 0));
    });

    suite.test('正式 reward-config.json 能被正規化讀入，且兩個里程碑套件都在', () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('fs') as typeof import('fs');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const path = require('path') as typeof import('path');
        const cfg = normalizeRewardConfig(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'resources', 'data', 'reward-config.json'), 'utf8')));
        assert.isTrue(cfg.bundles.some((b) => b.id === 'BUNDLE_MILESTONE_KILL_100'));
        assert.isTrue(cfg.bundles.some((b) => b.id === 'BUNDLE_MILESTONE_KILL_1000'));
    });

    suite.test('GameSession 整合：rewardMeta 隨存檔往返（亂數、保底、發放紀錄），讀檔後同 grantKey 仍冪等；沒用過獎勵就不寫欄位', async () => {
        const adapter = new MemoryStorageAdapter();
        const store = new PlayerSaveService(adapter);
        const make = () => {
            const session = new GameSession();
            session.setRosterStore(new InMemoryRosterStore([]));
            session.setSaveService(store);
            const bundle = createLocalApi(store, { now: () => 1_000 });
            bundle.setItemAuthority(session.itemAuthority());
            bundle.setRewardAuthority(session.rewardAuthority());
            bundle.setRewardConfig(testConfig());
            bundle.setWallet(new FakeWallet());
            bundle.setRewardHooks({ entropy: () => 'e' });
            return { session, api: bundle.api };
        };
        const a = make();
        await a.session.load();
        await a.session.save();
        const clean = await store.load();
        assert.isFalse(clean !== null && 'rewardMeta' in clean, '沒用過獎勵就不寫 rewardMeta，舊檔形狀不變');
        const first = ok(await a.api.cmd<RewardGrantResult>('reward.roll', { poolId: 'POOL_T', count: 3, grantKey: 'sess', source: { kind: 'quest' } }));
        await a.session.save();
        const b = make();
        await b.session.load();
        const replay = ok(await b.api.cmd<RewardGrantResult>('reward.roll', { poolId: 'POOL_T', count: 3, grantKey: 'sess', source: { kind: 'quest' } }));
        assert.equals(true, replay.replayed);
        assert.equals(JSON.stringify(first.plan), JSON.stringify(replay.plan));
        const view = ok(await b.api.query<{ poolId: string; pity: { count: number } }>('reward.pity', { poolId: 'POOL_T' }));
        assert.equals(first.pity?.count, view.pity.count, '保底計數讀檔後還在');
    });

    return suite;
}
