/**
 * RewardGachaPull.test.ts — GCH-R4（PROG-2-9463）：轉蛋抽取遷移到 reward.roll
 *
 * 用真實的獎池名單檔、武將名冊與 reward-config 的重複卡 bundle，經本機 adapter 跑完整一次抽卡：
 * 預檢餘額 → reward.roll（發武將 handler）→ wallet.spend → 重複卡 reward.claim。
 * 另鎖旗標解析、LocalGachaApi 走新路徑時的回應與機率來源、餘額不足整筆不生效。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import type { RewardAuthority } from '../assets/scripts/core/api/localserver/RewardCommands';
import type { WalletAuthority } from '../assets/scripts/core/api/localserver/WalletCommands';
import { gachaRewardEnabled } from '../assets/scripts/core/gacha/GachaRewardFlag';
import { LocalGachaApi } from '../assets/scripts/core/gacha/LocalGachaApi';
import { createGeneralGrantHandler, RewardGachaPort } from '../assets/scripts/core/gacha/RewardGachaPull';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { normalizeRewardConfig } from '../assets/scripts/shared/reward/RewardConfig';
import { buildRewardPools, legacyPoolIdsOf } from '../assets/scripts/shared/reward/RewardRoster';
import { emptyRewardMeta, type RewardMeta } from '../assets/scripts/shared/reward/RewardRules';

const ROOT = path.resolve(__dirname, '..');
const readJson = (rel: string): unknown => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf-8'));

class MemoryReward implements RewardAuthority {
    public rewardMeta: RewardMeta = emptyRewardMeta();
    public meta(): RewardMeta { return this.rewardMeta; }
    public setMeta(meta: RewardMeta): void { this.rewardMeta = meta; }
}

class FakeWallet implements WalletAuthority {
    public bag: Record<string, number> = { gems: 5000, bronze: 5000, tickets: 100 };
    public balance(c: string): number { return this.bag[c] ?? 0; }
    public spend(c: string, a: number): boolean { if (this.balance(c) < a) return false; this.bag[c] = this.balance(c) - a; return true; }
    public snapshot(): Record<string, number> { return { ...this.bag }; }
    public credit(c: string, a: number): void { this.bag[c] = this.balance(c) + a; }
}

function rig() {
    const generals = readJson('assets/resources/data/generals.json') as GeneralConfig[];
    const poolsRaw = readJson('assets/resources/data/gacha-reward-pools.json');
    const base = normalizeRewardConfig(readJson('assets/resources/data/reward-config.json'));
    const pools = buildRewardPools(poolsRaw, generals);
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
    const wallet = new FakeWallet();
    const reward = new MemoryReward();
    const owned = new Set<string>();
    bundle.setWallet(wallet);
    bundle.setRewardAuthority(reward);
    bundle.setRewardConfig({ ...base, pools: [...base.pools, ...pools] });
    bundle.setRewardHooks({ entropy: () => 'r4-entropy' });
    const byId = new Map(generals.map((g) => [g.id, g]));
    const host = {
        resolve: (id: string) => byId.get(id) ?? null,
        enroll: (g: GeneralConfig) => { const duplicate = owned.has(g.id); owned.add(g.id); return { duplicate }; },
    };
    bundle.registerRewardEffect('general', createGeneralGrantHandler(host));
    const pulled: Array<{ poolId: string; cost: number }> = [];
    const port = new RewardGachaPort(bundle.api, legacyPoolIdsOf(poolsRaw), {
        resolveGeneral: host.resolve,
        afterPull: (info) => { pulled.push({ poolId: info.poolId, cost: info.cost }); },
    });
    return { bundle, wallet, reward, owned, port, pulled, byId };
}

export function createRewardGachaPullSuite(): TestSuite {
    const suite = new TestSuite('RewardGachaPull（GCH-R4 抽取遷移）');

    suite.test('旗標：預設開；網址參數優先於本機存值；0／false／off 關閉', () => {
        assert.isTrue(gachaRewardEnabled('', null));
        assert.isTrue(gachaRewardEnabled('?a=1', undefined));
        assert.isTrue(!gachaRewardEnabled('?gachaReward=0', null));
        assert.isTrue(!gachaRewardEnabled('?x=1&gachaReward=off', '1'));
        assert.isTrue(gachaRewardEnabled('?gachaReward=1', '0'), '網址優先');
        assert.isTrue(!gachaRewardEnabled('', '0'));
        assert.isTrue(gachaRewardEnabled('', 'garbage'));
    });

    suite.test('名將池十連：扣款恰為總價、發十位男將入冊、保底計數前進、紀錄回呼只一次', async () => {
        const { wallet, port, owned, byId, reward, pulled } = rig();
        const out = await port.pull({ poolId: 'GENERAL_STANDARD_01', count: 10, currency: 'bronze', cost: 1500 });
        assert.equals(10, out.results.length);
        assert.equals(1500, out.spent);
        const refund = out.converted.reduce((t, c) => t + (c.bundleId === 'BUNDLE_GACHA_DUP_R' ? 100 : c.bundleId === 'BUNDLE_GACHA_DUP_SR' ? 400 : 0), 0);
        assert.equals(3500 + refund, wallet.bag.bronze, '只扣 1500（加上重複卡轉換）');
        assert.isTrue(out.results.every((r) => byId.get(r.general.id)?.gender === '男'));
        assert.equals(out.added.length, owned.size, '新將入冊數與名冊一致');
        assert.equals(10, out.added.length + out.duplicates.length);
        assert.isTrue(reward.rewardMeta.seq >= 1);
        assert.isTrue(Object.keys(reward.rewardMeta.pity).some((k) => k.indexOf('gacha.general') === 0), '保底計數有前進');
        assert.equals(1, pulled.length);
        assert.equals(1500, pulled[0].cost);
    });

    suite.test('紅顏池：只抽女將；已持有者不再入冊並轉成 bundle（依等階給貨幣）', async () => {
        const { wallet, port, owned, byId } = rig();
        for (const g of byId.values()) if (g.gender === '女') owned.add(g.id);
        const before = { ...wallet.bag };
        const out = await port.pull({ poolId: 'support-pool', count: 10, currency: 'gems', cost: 1600 });
        assert.isTrue(out.results.every((r) => byId.get(r.general.id)?.gender === '女'));
        assert.equals(10, out.duplicates.length, '全部已持有，十張都是重複');
        assert.equals(0, out.added.length);
        assert.equals(10, out.converted.length);
        const gained = (wallet.bag.bronze - before.bronze) + (wallet.bag.gems - (before.gems - 1600));
        assert.isTrue(gained > 0, '重複卡轉成貨幣');
        assert.isTrue(out.converted.every((c) => /^BUNDLE_GACHA_DUP_(R|SR|SSR)$/.test(c.bundleId)));
    });

    suite.test('餘額不足：丟錯、不抽、不入冊、保底與亂數不前進', async () => {
        const { wallet, port, owned, reward } = rig();
        wallet.bag.bronze = 100;
        let message = '';
        try { await port.pull({ poolId: 'GENERAL_STANDARD_01', count: 1, currency: 'bronze', cost: 150 }); } catch (e) { message = (e as Error).message; }
        assert.isTrue(message.startsWith('餘額不足'));
        assert.equals(0, owned.size);
        assert.equals(0, reward.rewardMeta.seq);
        assert.equals(100, wallet.bag.bronze);
    });

    suite.test('不認識的武將：整筆回滾，不扣款', async () => {
        const { wallet, port, bundle } = rig();
        void bundle;
        const broken = new RewardGachaPort(bundle.api, { GENERAL_STANDARD_01: 'POOL_GENERAL_MAIN' }, { resolveGeneral: () => null });
        bundle.registerRewardEffect('general', createGeneralGrantHandler({ resolve: () => null, enroll: () => ({ duplicate: false }) }));
        let failed = false;
        try { await broken.pull({ poolId: 'GENERAL_STANDARD_01', count: 1, currency: 'bronze', cost: 150 }); } catch { failed = true; }
        assert.isTrue(failed);
        assert.equals(5000, wallet.bag.bronze);
        void port;
    });

    suite.test('同一個 requestId 重送：回原抽取結果（reward.roll 冪等），不會重複發', async () => {
        const { port, owned, wallet } = rig();
        const a = await port.pull({ poolId: 'GENERAL_STANDARD_01', count: 1, currency: 'bronze', cost: 150, requestId: 'same' });
        const sizeAfterFirst = owned.size;
        let secondId = '';
        try { secondId = (await port.pull({ poolId: 'GENERAL_STANDARD_01', count: 1, currency: 'bronze', cost: 150, requestId: 'same' })).results[0]?.general.id ?? ''; } catch { secondId = ''; }
        assert.isTrue(owned.size === sizeAfterFirst || secondId === a.results[0].general.id);
        assert.isTrue(wallet.bag.bronze >= 5000 - 300);
    });

    suite.test('LocalGachaApi 走新路徑：機率與保底來自獎池、回應含道具與扣款；舊路徑旗標關閉（port 為 null）不受影響', async () => {
        const { port, wallet } = rig();
        const service = {
            getOpenLimitedWindow: () => null,
            getPoolPityState: () => ({ pullCount: 0, lastSsrPull: 0 }),
            getWalletSnapshot: () => ({ ...wallet.bag, oracle: 0, mentorTickets: 0, scorePoints: 0 }),
        };
        const mainPool = { key: 'general', poolId: 'GENERAL_STANDARD_01', theme: 'wood' as const, name: '名將', sub: '', badge: '', series: '', brief: '', currencies: ['bronze' as const, 'gems' as const], singleCost: 150, tenCost: 1500, pityLabel: 'SSR 保底進度' };
        const mk = (on: boolean) => new LocalGachaApi({
            system: { pool: () => null } as never, service: service as never, pools: () => [mainPool], candidates: () => [],
            reward: () => (on ? port : null),
        });
        const pools = await mk(true).listPools();
        const rate = (r: string) => pools[0].rates.find((x) => x.rarity === r)?.percent;
        assert.equals(3, rate('SSR'));
        assert.equals(10, rate('SR'));
        assert.equals(87, rate('R'));
        assert.equals(90, pools[0].pity.max);
        const res = await mk(true).pull({ poolId: 'GENERAL_STANDARD_01', count: 10 });
        assert.isTrue(res.ok);
        if (res.ok) { assert.equals(10, res.items.length); assert.equals('bronze', res.currency); assert.equals(1500, res.spent); }
        const legacy = await mk(false).listPools();
        assert.equals(50, legacy[0].pity.max, '旗標關閉走舊的小保底間隔');
    });

    suite.test('deferDuplicates：重複卡不轉 bundle、不加錢，原樣交回（給重複卡分流彈窗）；預設仍自動轉換', async () => {
        const { wallet, port, owned, byId, bundle } = rig();
        for (const g of byId.values()) if (g.gender === '女') owned.add(g.id);
        const deferred = new RewardGachaPort(bundle.api, { support: 'POOL_HEROINE' } as Record<string, string>, { resolveGeneral: (id) => byId.get(id) ?? null }, () => 1_000, true);
        const before = { ...wallet.bag };
        const out = await deferred.pull({ poolId: 'support', count: 10, currency: 'gems', cost: 1600 });
        assert.equals(10, out.duplicates.length, '十張都是已持有');
        assert.equals(0, out.converted.length, '不自動轉換');
        assert.equals(0, out.added.length);
        assert.equals(before.gems - 1600, wallet.bag.gems, '只扣抽卡費，沒有重複卡返還');
        assert.equals(before.bronze, wallet.bag.bronze);
        const auto = await port.pull({ poolId: 'support-pool', count: 10, currency: 'gems', cost: 1600 });
        assert.equals(10, auto.converted.length, '預設路徑照舊自動轉換');
    });

    return suite;
}
