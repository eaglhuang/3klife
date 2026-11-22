/**
 * SupportPoolRoll.test.ts — SUP-10（PROG-2-9243）教官池 POOL_SUPPORT（doc_spec_1264 §16～§18、TC-SUP-12／13／14）
 *
 * 鎖住：itemQuery 從支援卡表展開成 25 張逐卡項目；逐卡機率與規格 §17 表一致且總和為 1；
 * 十萬次蒙地卡羅與公開機率誤差 < 0.5 個百分點；硬保底（SSR 80、SR 以上 10）必出；
 * 教官池只收連線券（銀兩、靈玉都不收）；走 reward.roll＋supportCard 效果發卡（十連入帳、重複轉傳承／學分）；
 * 機率說明的完整機率表由 reward.pools 排出，沒有寫死的機率常數；開局禮包的連線券夠抽一次十連。
 *
 * Unity 對照：像抽卡池的 EditMode 測試加一個機率表快照測試。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import type { ItemAuthority, StockTable } from '../assets/scripts/core/api/localserver/ItemCommands';
import type { RewardAuthority } from '../assets/scripts/core/api/localserver/RewardCommands';
import { createSupportCardHandler, SUPPORT_CARD_EFFECT_KIND } from '../assets/scripts/core/api/localserver/SupportCardEffect';
import type { WalletAuthority } from '../assets/scripts/core/api/localserver/WalletCommands';
import { gachaCostOf, parseGachaMainPools, pickPullCurrency } from '../assets/scripts/core/gacha/GachaApi';
import { buildRateTableRows, formatRatePercent } from '../assets/scripts/core/gacha/GachaRateTable';
import { RewardGachaPort } from '../assets/scripts/core/gacha/RewardGachaPull';
import { supportCardItemMembers } from '../assets/scripts/core/gacha/SupportCardGachaView';
import { GACHA_POOLS } from '../assets/scripts/ui/core/GachaScreenNodes';
import { gachaApiView, tenNoteOf } from '../assets/scripts/ui/core/GachaApiTexts';
import { STARTER_GACHA_WALLET } from '../assets/scripts/core/services/GachaWalletRules';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { DeterministicRngSession } from '../assets/scripts/shared/foundation/DeterministicRng';
import { DEFAULT_ITEM_CONFIG, type HolderRef } from '../assets/scripts/shared/item/ItemConfig';
import { emptyItemMeta, type ItemMeta } from '../assets/scripts/shared/item/ItemRules';
import { normalizeRewardConfig } from '../assets/scripts/shared/reward/RewardConfig';
import { poolViewOf } from '../assets/scripts/shared/reward/RewardDisclosure';
import { buildRewardPools, legacyPoolIdsOf } from '../assets/scripts/shared/reward/RewardRoster';
import { emptyRewardMeta, rollPool, type RewardMeta } from '../assets/scripts/shared/reward/RewardRules';
import { findSupportCard, normalizeSupportCards } from '../assets/scripts/shared/support/SupportCardConfig';
import { DEFAULT_SUPPORT_RULES, withSupportItems } from '../assets/scripts/shared/support/SupportRules';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): unknown => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as unknown;
const cards = normalizeSupportCards(read('assets/resources/data/academy-support-cards.json'));
const rules = DEFAULT_SUPPORT_RULES;
const poolsRaw = read('assets/resources/data/gacha-reward-pools.json');
const pools = buildRewardPools(poolsRaw, [], supportCardItemMembers(cards.cards));
const support = pools.find((p) => p.id === 'POOL_SUPPORT')!;
const LEGACY = 'mentor-pool';

class MemoryItems implements ItemAuthority {
    public stock: Record<string, number> = {};
    public itemMeta: ItemMeta = emptyItemMeta();
    public read(holder: HolderRef, container: string): StockTable | null { return holder.kind === 'household' && container === 'main' ? { ...this.stock } : null; }
    public write(_holder: HolderRef, _container: string, next: StockTable): void { this.stock = { ...next }; }
    public meta(): ItemMeta { return this.itemMeta; }
    public setMeta(meta: ItemMeta): void { this.itemMeta = meta; }
}

class MemoryReward implements RewardAuthority {
    public rewardMeta: RewardMeta = emptyRewardMeta();
    public meta(): RewardMeta { return this.rewardMeta; }
    public setMeta(meta: RewardMeta): void { this.rewardMeta = meta; }
}

class FakeWallet implements WalletAuthority {
    public constructor(public bag: Record<string, number>) {}
    public balance(c: string): number { return this.bag[c] ?? 0; }
    public spend(c: string, a: number): boolean { if (this.balance(c) < a) return false; this.bag[c] = this.balance(c) - a; return true; }
    public snapshot(): Record<string, number> { return { ...this.bag }; }
    public credit(c: string, a: number): void { this.bag[c] = this.balance(c) + a; }
}

function rig(tickets: number, entropy = 'sup10-entropy') {
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
    const items = new MemoryItems();
    const reward = new MemoryReward();
    const wallet = new FakeWallet({ mentorTickets: tickets, gems: 5000, gold: 5000 });
    bundle.setWallet(wallet);
    bundle.setItemAuthority(items);
    bundle.setItemConfig(withSupportItems(DEFAULT_ITEM_CONFIG, cards, rules));
    bundle.setRewardAuthority(reward);
    bundle.setRewardConfig({ ...normalizeRewardConfig({ bundles: [] }), pools });
    bundle.setRewardHooks({ entropy: () => entropy });
    bundle.registerRewardEffect(SUPPORT_CARD_EFFECT_KIND, createSupportCardHandler(() => ({ cards, rules })));
    const port = new RewardGachaPort(bundle.api, legacyPoolIdsOf(poolsRaw), {
        resolveGeneral: () => null,
        resolveSupportCard: (id) => findSupportCard(cards, id),
    });
    return { port, items, reward, wallet };
}

const ssrIds = cards.cards.filter((c) => c.rarity === 'SSR').map((c) => c.cardId);

export function createSupportPoolRollSuite(): TestSuite {
    const suite = new TestSuite('SupportPoolRoll（SUP-10 教官池）');

    suite.test('POOL_SUPPORT 以 itemQuery 展開成 25 張逐卡項目：SSR 7（UP 1＋一般 6）、SR 11（UP 2＋一般 9）、R 7', () => {
        assert.isTrue(!!support);
        assert.equals(25, support.entries.length);
        const count = (tier: string, group?: string): number => support.entries.filter((e) => e.tier === tier && (group === undefined || e.group === group)).length;
        assert.equals(7, count('SSR')); assert.equals(1, count('SSR', 'up')); assert.equals(6, count('SSR', 'normal'));
        assert.equals(11, count('SR')); assert.equals(2, count('SR', 'up')); assert.equals(9, count('SR', 'normal'));
        assert.equals(7, count('R'));
        assert.isTrue(support.entries.every((e) => e.effect.kind === SUPPORT_CARD_EFFECT_KIND && String(e.effect.itemId).startsWith('ITEM_SUPCARD_')));
        assert.equals('SUP_HUA_TUO', support.entries.find((e) => e.group === 'up' && e.tier === 'SSR')!.id);
    });

    suite.test('逐卡機率與規格 §17 表一致、總和為 1（TC-SUP-12）', () => {
        const view = poolViewOf(support, true, {});
        const rate = (id: string): number => view.tiers.flatMap((t) => t.entries).find((e) => e.entryId === id)!.rate;
        assert.isTrue(Math.abs(rate('SUP_HUA_TUO') - 0.015) < 1e-9);
        assert.isTrue(Math.abs(rate('SUP_SIMA_HUI') - 0.0025) < 1e-9);
        assert.isTrue(Math.abs(rate('SUP_PANG_DEGONG') - 0.051) < 1e-9);
        assert.isTrue(Math.abs(rate('SUP_LU_ZHI') - 0.17 * 0.4 / 9) < 1e-9, 'SR 一般 0.756%');
        assert.isTrue(Math.abs(rate('SUP_MA_RONG') - 0.8 / 7) < 1e-9, 'R 11.429%');
        const total = view.tiers.reduce((sum, t) => sum + t.entries.reduce((s, e) => s + e.rate, 0), 0);
        assert.isTrue(Math.abs(total - 1) < 1e-9);
        assert.equals('0.756%', formatRatePercent(rate('SUP_LU_ZHI')));
        assert.equals('1.5%', formatRatePercent(0.015));
    });

    suite.test('十萬次蒙地卡羅：三個等階的實際比例與公開機率誤差 < 0.5 個百分點', () => {
        const rng = new DeterministicRngSession('7'.repeat(64));
        const tierOf = new Map(support.entries.map((e) => [e.id, e.tier]));
        const hits: Record<string, number> = { R: 0, SR: 0, SSR: 0 };
        const N = 100_000;
        // 不帶保底計數（每次從 0 起算前 1 抽）：只驗基礎機率
        for (let i = 0; i < N; i += 1) hits[tierOf.get(rollPool(support, 1, rng, {}).items[0].entryId) ?? '?'] += 1;
        assert.isTrue(Math.abs(hits.SSR / N - 0.03) < 0.005, `SSR ${hits.SSR / N}`);
        assert.isTrue(Math.abs(hits.SR / N - 0.17) < 0.005, `SR ${hits.SR / N}`);
        assert.isTrue(Math.abs(hits.R / N - 0.8) < 0.005, `R ${hits.R / N}`);
    });

    suite.test('硬保底：SSR 第 90 抽必出 SSR；SR 以上第 10 抽必出 SR 或 SSR', () => {
        for (let i = 0; i < 40; i += 1) {
            const rng = new DeterministicRngSession(`${i}`.padStart(64, 'a'));
            const ssr = rollPool(support, 1, rng, { 'gacha.support.ssr': 89, 'gacha.support.sr': 3 });
            assert.equals('SSR', support.entries.find((e) => e.id === ssr.items[0].entryId)!.tier);
            assert.equals(0, ssr.pity['gacha.support.ssr']);
            const sr = rollPool(support, 1, rng, { 'gacha.support.ssr': 3, 'gacha.support.sr': 9 });
            assert.isTrue(support.entries.find((e) => e.id === sr.items[0].entryId)!.tier !== 'R');
            assert.equals(0, sr.pity['gacha.support.sr']);
        }
    });

    suite.test('保底設定：SSR 軟 50／硬 90（使用者 11/22 裁決：與名將池完全一致）、SR 軟 6／硬 10；不做大保底、沒有累計兌換', () => {
        const ssr = support.pity.find((p) => p.tier === 'SSR')!;
        const sr = support.pity.find((p) => p.tier === 'SR')!;
        assert.equals(50, ssr.soft!.startAt); assert.equals(90, ssr.hardCount); assert.equals(2, ssr.soft!.curveExp);
        assert.equals(6, sr.soft!.startAt); assert.equals(10, sr.hardCount); assert.equals(1, sr.soft!.curveExp);
        assert.equals(0, support.tallies.length);
    });

    suite.test('教官池只收連線券：銀兩、黃金、靈玉都被擋（TC-SUP-13）；連線券夠付就過', () => {
        const mainPools = parseGachaMainPools(read('assets/resources/data/gacha-main-pools.json'));
        const pool = mainPools.find((p) => p.poolId === LEGACY)!;
        assert.equals('教官池', pool.name);
        assert.equals('mentorTickets', pool.currencies.join(','));
        const wallet = { gems: 9999, gold: 99999, bronze: 99999, tickets: 99, mentorTickets: 10 };
        for (const c of ['gold', 'gems', 'bronze', 'tickets'] as const) {
            const miss = pickPullCurrency(pool, 10, wallet, c) as { ok: false; error: string };
            assert.equals('CURRENCY_NOT_ALLOWED', miss.error);
        }
        assert.equals(10, gachaCostOf(pool, 10));
        const ok = pickPullCurrency(pool, 10, wallet);
        assert.isTrue(ok.ok && ok.currency === 'mentorTickets');
        const poor = pickPullCurrency(pool, 10, { ...wallet, mentorTickets: 9 }) as { ok: false; error: string; shortfall: number };
        assert.equals('INSUFFICIENT_CURRENCY', poor.error);
        assert.equals(1, poor.shortfall);
    });

    suite.test('開局禮包的連線券（免費來源）夠抽一次十連', () => {
        const mainPools = parseGachaMainPools(read('assets/resources/data/gacha-main-pools.json'));
        const pool = mainPools.find((p) => p.poolId === LEGACY)!;
        assert.isTrue(STARTER_GACHA_WALLET.mentorTickets >= gachaCostOf(pool, 10));
    });

    suite.test('舊池 id mentor-pool 對到 POOL_SUPPORT；port 十連走 reward.roll：扣 10 連線券、發卡、保底計數推進', async () => {
        const { port, items, wallet, reward } = rig(10);
        assert.equals('POOL_SUPPORT', port.rewardPoolOf(LEGACY));
        const out = await port.pull({ poolId: LEGACY, count: 10, currency: 'mentorTickets', cost: 10, requestId: 'r1' });
        assert.equals(10, out.results.length);
        assert.equals(10, out.supportDraws.length);
        assert.equals(0, wallet.bag.mentorTickets);
        assert.equals(5000, wallet.bag.gems, '靈玉不動');
        assert.equals(0, out.added.length, '支援卡不是武將，不入名冊');
        assert.isTrue(out.results.every((r) => r.general.id.startsWith('SUP_')));
        const held = Object.keys(items.stock).filter((k) => k.startsWith('ITEM_SUPCARD_'));
        assert.isTrue(held.length >= 1 && held.length <= 10);
        assert.isTrue(held.every((k) => items.stock[k] === 1), '每張卡最多一件（unique）');
        const sr = reward.rewardMeta.pity['gacha.support.sr'] ?? 0;
        const ssr = reward.rewardMeta.pity['gacha.support.ssr'] ?? 0;
        assert.isTrue(sr <= 9 && ssr <= 10, '保底計數落在階梯範圍內');
    });

    suite.test('連線券不足：抽卡丟錯、不扣款不發卡', async () => {
        const { port, items, wallet } = rig(3);
        let message = '';
        try { await port.pull({ poolId: LEGACY, count: 10, currency: 'mentorTickets', cost: 10 }); } catch (e) { message = (e as Error).message; }
        assert.isTrue(message.includes('餘額不足'));
        assert.equals(3, wallet.bag.mentorTickets);
        assert.equals(0, Object.keys(items.stock).length);
    });

    suite.test('同一張卡抽到第二次：結果標「傳承 +1」（或學分），卡片仍只有一張', async () => {
        const { port, items } = rig(100, 'dup-entropy');
        let seenDuplicate = false;
        const owned = new Set<string>();
        for (let i = 0; i < 40; i += 1) {
            const out = await port.pull({ poolId: LEGACY, count: 1, currency: 'mentorTickets', cost: 1, requestId: `d${i}` });
            const d = out.supportDraws[0];
            if (owned.has(d.cardId)) {
                seenDuplicate = true;
                assert.isTrue(d.outcome === '傳承 +1' || (d.outcome ?? '').startsWith('學分'), `重複卡結算 ${d.outcome}`);
            } else {
                assert.equals(null, d.outcome);
            }
            owned.add(d.cardId);
        }
        assert.isTrue(seenDuplicate, '40 抽內必有重複');
        assert.equals(owned.size, Object.keys(items.stock).filter((k) => k.startsWith('ITEM_SUPCARD_')).length);
    });

    suite.test('機率說明：完整機率表由 reward.pools 排出（每個稀有度一列、含 UP 與逐張機率、保底與版本）', async () => {
        const { port } = rig(10);
        const view = await port.disclosure(LEGACY);
        assert.isTrue(!!view && view.public);
        const nameOf = (nameKey: string | null, id: string): string => cards.cards.find((c) => c.nameKey === nameKey)?.name ?? id;
        const rows = buildRateTableRows(view!, nameOf);
        const detailOf = (prefix: string): string => rows.filter((r) => r.title.startsWith(prefix)).map((r) => r.detail).join('　');
        assert.isTrue(rows.some((r) => r.title === 'SSR 共 3%　UP（1 張）'));
        assert.isTrue(detailOf('SSR 共').includes('華佗 1.5%') && detailOf('SSR 共').includes('司馬徽 0.25%'));
        const sr = detailOf('SR 共');
        assert.isTrue(sr.includes('龐德公 5.1%') && sr.includes('黃月英 5.1%') && sr.includes('盧植 0.756%'));
        assert.isTrue(detailOf('R 共').includes('馬融 11.429%'));
        const cardRows = rows.filter((r) => / 共 /.test(r.title));
        assert.equals(25, cardRows.reduce((n, r) => n + (r.detail.match(/%/g)?.length ?? 0), 0), '25 張卡各列一次');
        assert.isTrue(rows.every((r) => r.detail.split('　').length <= 4 || /保底|公開版本/.test(r.title)), '一列最多 4 張');
        assert.isTrue(rows.some((r) => r.title === 'SSR 保底' && r.detail.includes('第 50 抽起') && r.detail.includes('第 90 抽必出')));
        assert.isTrue(rows.some((r) => r.title === 'SR 以上 保底' && r.detail.includes('第 6 抽起') && r.detail.includes('第 10 抽必出')));
        assert.isTrue(rows.some((r) => r.title === '公開版本' && r.detail.startsWith('2026-11-22')), '公開版本號隨機率調整更新');
        assert.equals(['SSR', 'SR', 'R'].join(), [...new Set(rows.filter((r) => / 共 /.test(r.title)).map((r) => r.title.split(' ')[0]))].join(), '由高到低');
    });

    suite.test('十連小字與橫幅主角由獎池資料產生：第 10 抽必出 SR 以上；UP 卡是華佗', async () => {
        const { port } = rig(10);
        const v = await port.view(LEGACY);
        assert.isTrue(!!v);
        const pity = { label: 'SSR 保底進度', current: 0, max: 90, destinyCurrent: 0, destinyMax: 200 };
        assert.equals('第 10 抽必出 SR 以上', tenNoteOf({ pities: v!.pities, pity }));
        assert.equals('第 90 抽必出 SSR', tenNoteOf({ pity }), '沒有獎池資料的舊池取 SSR 小保底');
        assert.equals('SUP_HUA_TUO', v!.upEntryIds[0], 'UP 清單第一個是 SSR 華佗（橫幅主角）');
        const hua = cards.cards.find((c) => c.cardId === 'SUP_HUA_TUO');
        assert.equals('hua-tuo', hua?.projectionOf, '華佗卡投影對象');
        const base = { key: 'support', poolId: 'mentor-pool', theme: 'jade', name: '教官池', sub: '', badge: '', series: '★ 教官系列 · 常設', brief: 'a b', showcaseGeneralId: 'hua-tuo', featuredGeneralIds: [], endsAtMs: null, currencies: ['mentorTickets'], singleCost: 1, tenCost: 10, rates: [], pity };
        const pool = GACHA_POOLS.find((p) => p.key === 'support')!;
        const wallet = { gems: 0, bronze: 0, tickets: 0, gold: 0, mentorTickets: 10 } as never;
        const nameOf = (id: string): string => id;
        const upView = gachaApiView(pool, { ...base, showcaseIsUp: true } as never, wallet, nameOf, 0);
        assert.equals('★ 教官系列 · 本期 UP', upView.texts[pool.eventChip], '主角是 UP 卡：標籤寫本期 UP');
        const plainView = gachaApiView(pool, { ...base, showcaseIsUp: false } as never, wallet, nameOf, 0);
        assert.equals('★ 教官系列 · 常設', plainView.texts[pool.eventChip], '常駐卡：標籤維持常設');
    });

    suite.test('SSR 卡清單與卡表一致（獎池不手寫卡）', () => {
        assert.equals(ssrIds.slice().sort().join(), support.entries.filter((e) => e.tier === 'SSR').map((e) => e.id).sort().join());
    });

    return suite;
}
