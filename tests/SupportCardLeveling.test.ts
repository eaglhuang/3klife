/**
 * SupportCardLeveling.test.ts — 支援卡升級與材料（PROG-2-9241 SUP-2；doc_spec_1264 §5.1～§5.2、TC-SUP-06）
 *
 * 鎖住：等級上限（R20／SR25／SSR30，傳承每次 +5）、expToNext＝100＋40×(L−1) 與規格列的累計經驗、
 * 經驗材料（小抄／講義／錄播回放／學分）經 item.use 加到卡實例、等級由權威端推得、到上限不再吃經驗（只扣需要的個數）、
 * 錯誤路徑不動庫存、升級結果隨存檔保存。
 *
 * Unity 對照：像經驗藥水的 EditMode 契約測試，加一條「吃藥後存檔再讀」的整合測試。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import type { ItemAuthority, StockTable } from '../assets/scripts/core/api/localserver/ItemCommands';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { isApiFail } from '../assets/scripts/shared/api/ApiProtocol';
import type { ItemUseResult } from '../assets/scripts/shared/api/ApiCommands';
import { DEFAULT_ITEM_CONFIG, normalizeItemConfig, type HolderRef, type ItemConfigV1, type ItemGrowthRule } from '../assets/scripts/shared/item/ItemConfig';
import { applyInstanceExp, emptyItemMeta, expToCapOf, expToNextOf, levelCapOf, type ItemMeta } from '../assets/scripts/shared/item/ItemRules';
import { normalizeSupportCards } from '../assets/scripts/shared/support/SupportCardConfig';
import {
    DEFAULT_SUPPORT_RULES, ITEM_SUP_CREDIT, normalizeSupportRules, supportGrowthRule, supportMaterialItemDefs, supportTierOf, withSupportItems,
} from '../assets/scripts/shared/support/SupportRules';

const ROOT = path.join(__dirname, '..');
const read = (rel: string): unknown => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as unknown;
const cards = normalizeSupportCards(read('assets/resources/data/academy-support-cards.json'));
const rules = DEFAULT_SUPPORT_RULES;
const SSR = 'ITEM_SUPCARD_SIMA_HUI';
const SR = 'ITEM_SUPCARD_PANG_DEGONG';
const R = 'ITEM_SUPCARD_MA_RONG';

function mergedConfig(): ItemConfigV1 {
    return withSupportItems(DEFAULT_ITEM_CONFIG, cards, rules);
}

class MemoryAuthority implements ItemAuthority {
    public stock: Record<string, number> = {};
    public itemMeta: ItemMeta = emptyItemMeta();
    public read(holder: HolderRef, container: string): StockTable | null {
        return holder.kind === 'household' && container === 'main' ? { ...this.stock } : null;
    }
    public write(_holder: HolderRef, _container: string, next: StockTable): void { this.stock = { ...next }; }
    public meta(): ItemMeta { return this.itemMeta; }
    public setMeta(meta: ItemMeta): void { this.itemMeta = meta; }
}

async function rig(stock: Record<string, number> = {}, cardIds: string[] = [SSR]) {
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
    const authority = new MemoryAuthority();
    bundle.setItemAuthority(authority);
    bundle.setItemConfig(mergedConfig());
    for (const id of cardIds) await bundle.api.cmd('item.grant', { itemId: id, qty: 1, source: 'REWARD' });
    for (const [id, qty] of Object.entries(stock)) await bundle.api.cmd('item.grant', { itemId: id, qty, source: 'REWARD' });
    return { api: bundle.api, authority, bundle };
}

const use = (itemId: string, qty: number, target: string) => ({ itemId, qty, target: { itemId: target } });

/** 從 Lv1 累計到 level 需要的經驗（規格 §5.2 列的 Lv20 8,740、Lv30 19,140、Lv40 33,540、Lv45 42,240、Lv50 51,940） */
function cumulative(growth: ItemGrowthRule, level: number): number {
    let sum = 0;
    for (let l = 1; l < level; l += 1) sum += expToNextOf(growth, l);
    return sum;
}

export function createSupportCardLevelingSuite(): TestSuite {
    const suite = new TestSuite('SupportCardLeveling (支援卡升級與材料 PROG-2-9241 SUP-2)');

    suite.test('support-rules.json 與內建預設完全一致；壞設定補預設不丟例外', () => {
        assert.equals(JSON.stringify(DEFAULT_SUPPORT_RULES), JSON.stringify(normalizeSupportRules(read('assets/resources/data/support-rules.json'))));
        assert.equals(DEFAULT_SUPPORT_RULES, normalizeSupportRules(null));
        const odd = normalizeSupportRules({ cap0: { R: -1, SR: 'x' }, expToNext: { base: 0 }, materials: [{ itemId: ITEM_SUP_CREDIT, exp: 5, name: 'x' }, { itemId: 'M1', exp: 50, name: '測試' }] });
        assert.equals(20, odd.cap0.R);
        assert.equals(100, odd.expToNext.base);
        assert.equals(1, odd.materials.length, '學分不能列在 materials、壞條目被丟掉');
        assert.equals('M1', odd.materials[0].itemId);
    });

    suite.test('等級上限：R20／SR25／SSR30；傳承每次 +5，最多 4 次（R 40／SR 45／SSR 50）；超過 4 次不再加', () => {
        const want = { R: [20, 25, 30, 35, 40], SR: [25, 30, 35, 40, 45], SSR: [30, 35, 40, 45, 50] };
        for (const rarity of ['R', 'SR', 'SSR'] as const) {
            const g = supportGrowthRule(rules, rarity);
            for (let b = 0; b <= 4; b += 1) assert.equals(want[rarity][b], levelCapOf(g, b), `${rarity} 傳承 ${b}`);
            assert.equals(want[rarity][4], levelCapOf(g, 9), `${rarity} 傳承超過 4 次不再加`);
        }
    });

    suite.test('TC-SUP-06：expToNext＝100＋40×(L−1)，累計經驗 Lv20 8,740／Lv30 19,140／Lv40 33,540／Lv45 42,240／Lv50 51,940', () => {
        const g = supportGrowthRule(rules, 'SSR');
        assert.equals(100, expToNextOf(g, 1));
        assert.equals(140, expToNextOf(g, 2));
        assert.equals(100 + 40 * 28, expToNextOf(g, 29));
        const want: Record<number, number> = { 20: 8740, 30: 19140, 40: 33540, 45: 42240, 50: 51940 };
        for (const [lv, exp] of Object.entries(want)) assert.equals(exp, cumulative(g, Number(lv)), `累計到 Lv${lv}`);
        assert.equals(19140, expToCapOf(g, { level: 1, exp: 0, limitBreak: 0 }), 'SSR 升到初始上限 Lv30 還差 19,140');
        assert.equals(19140 - 60, expToCapOf(g, { level: 1, exp: 60, limitBreak: 0 }), '目前這一級已累積的經驗要扣掉');
        assert.equals(0, expToCapOf(g, { level: 30, exp: 0, limitBreak: 0 }));
    });

    suite.test('applyInstanceExp：跨級進位、剩餘留在目前這一級；到上限 exp 歸 0 且多的不算；上限提高後可繼續', () => {
        const g = supportGrowthRule(rules, 'R');
        const a = applyInstanceExp(g, { level: 1, exp: 0, limitBreak: 0 }, 500);
        assert.equals(JSON.stringify({ level: 4, exp: 80, limitBreak: 0 }), JSON.stringify(a.state), '100＋140＋180＝420，剩 80');
        assert.equals(500, a.absorbed);
        assert.equals(3, a.levelsGained);
        assert.isFalse(a.atCap);
        const cap = applyInstanceExp(g, { level: 19, exp: 10, limitBreak: 0 }, 99999);
        assert.equals(20, cap.state.level);
        assert.equals(0, cap.state.exp);
        assert.isTrue(cap.atCap);
        assert.equals(100 + 40 * 18 - 10, cap.absorbed, '只吃到上限需要的');
        const again = applyInstanceExp(g, cap.state, 1000);
        assert.equals(0, again.absorbed, '到上限不再增加');
        const afterBreak = applyInstanceExp(g, { level: 20, exp: 0, limitBreak: 1 }, 100 + 40 * 19);
        assert.equals(21, afterBreak.state.level, '傳承後上限 25，可以繼續升');
        assert.equals(0, applyInstanceExp(g, { level: 5, exp: 3, limitBreak: 0 }, 0).absorbed);
        assert.equals(0, applyInstanceExp(g, { level: 5, exp: 3, limitBreak: 0 }, -50).absorbed);
    });

    suite.test('階：Lv1～9 初窺、10～19 入門、20～29 登堂、30～39 入室、40 以上 出師', () => {
        const at: Array<[number, string]> = [[1, '初窺'], [9, '初窺'], [10, '入門'], [19, '入門'], [20, '登堂'], [29, '登堂'], [30, '入室'], [39, '入室'], [40, '出師'], [50, '出師']];
        for (const [lv, key] of at) assert.equals(key, supportTierOf(rules, lv), `Lv${lv}`);
    });

    suite.test('材料物品定義：小抄 100／講義 500／錄播回放 2000／學分 20 經驗；可疊加、上限 9999、不綁定、帶 useEffect；卡帶依稀有度的 growth', () => {
        const defs = supportMaterialItemDefs(rules);
        const exp = (id: string) => defs.find((d) => d.id === id)?.useEffect?.exp;
        assert.equals(100, exp('ITEM_SUP_EXP_S'));
        assert.equals(500, exp('ITEM_SUP_EXP_M'));
        assert.equals(2000, exp('ITEM_SUP_EXP_L'));
        assert.equals(20, exp(ITEM_SUP_CREDIT));
        for (const d of defs) {
            assert.equals('stackable', d.stack.mode);
            assert.equals(9999, d.stack.max);
            assert.equals('none', d.bind);
        }
        assert.equals('material', defs.find((d) => d.id === ITEM_SUP_CREDIT)?.kind);
        const merged = mergedConfig();
        const growthOf = (id: string) => merged.items.find((d) => d.id === id)?.growth;
        assert.equals(30, growthOf(SSR)?.cap0);
        assert.equals(25, growthOf(SR)?.cap0);
        assert.equals(20, growthOf(R)?.cap0);
        assert.equals(JSON.stringify(merged), JSON.stringify(normalizeItemConfig(JSON.parse(JSON.stringify(merged)))), '設定來回不變');
    });

    suite.test('item.use：500 經驗的材料加到卡上 → Lv4 剩 80；扣材料、回結果、帶 delta 與 instanceChanged 事件', async () => {
        const { api, authority } = await rig({ ITEM_SUP_EXP_S: 3, ITEM_SUP_EXP_M: 1 });
        const events: string[] = [];
        api.subscribe('inventory.instanceChanged', () => events.push('inst'));
        const r = await api.cmd<ItemUseResult>('item.use', use('ITEM_SUP_EXP_M', 1, SSR));
        if (isApiFail(r)) throw new Error(r.message);
        assert.equals(1, r.result.consumed);
        assert.equals(500, r.result.expGained);
        assert.equals(3, r.result.levelsGained);
        assert.equals(4, r.result.level);
        assert.equals(80, r.result.exp);
        assert.equals(0, r.result.count);
        assert.equals(undefined, authority.stock.ITEM_SUP_EXP_M, '數量歸零移除該列');
        assert.equals(4, authority.itemMeta.instances?.[SSR]?.level);
        assert.isTrue((r.delta ?? []).some((d) => d.path === `/itemInstances/${SSR}`));
        assert.equals(1, events.length);
        const ledger = await api.query<{ records: Array<{ reason: string; delta: number }> }>('item.ledger', {});
        assert.isTrue(ledger.ok && ledger.result.records.some((x) => x.reason === 'USE' && x.delta === -1));
        const r2 = await api.cmd<ItemUseResult>('item.use', use('ITEM_SUP_EXP_S', 3, SSR));
        if (isApiFail(r2)) throw new Error(r2.message);
        assert.equals(3, r2.result.consumed);
        assert.equals(5, r2.result.level, '80＋300＝380，Lv4 要 220，升 Lv5 剩 160');
        assert.equals(160, r2.result.exp);
    });

    suite.test('學分也是經驗材料：每個 20 經驗，5 個 ＝ 100 經驗升 1 級', async () => {
        const { api } = await rig({ [ITEM_SUP_CREDIT]: 5 }, [R]);
        const r = await api.cmd<ItemUseResult>('item.use', use(ITEM_SUP_CREDIT, 5, R));
        if (isApiFail(r)) throw new Error(r.message);
        assert.equals(100, r.result.expGained);
        assert.equals(2, r.result.level);
        assert.equals(0, r.result.exp);
    });

    suite.test('只扣升到上限需要的個數：SSR 錄播回放 10 個（20,000）升到 Lv30 只扣 10；SR 講義 100 個只扣 27；到上限後再用 E318 且不扣', async () => {
        const a = await rig({ ITEM_SUP_EXP_L: 20 });
        const r = await a.api.cmd<ItemUseResult>('item.use', use('ITEM_SUP_EXP_L', 20, SSR));
        if (isApiFail(r)) throw new Error(r.message);
        assert.equals(10, r.result.consumed, 'ceil(19140 ÷ 2000)＝10');
        assert.equals(19140, r.result.expGained, '多出的 860 經驗不算');
        assert.equals(30, r.result.level);
        assert.isTrue(r.result.atCap);
        assert.equals(10, a.authority.stock.ITEM_SUP_EXP_L, '剩 10 個沒動');
        const blocked = await a.api.cmd('item.use', use('ITEM_SUP_EXP_L', 1, SSR));
        assert.isTrue(isApiFail(blocked) && blocked.errorCode === 'E318', '到上限請先傳承');
        assert.equals(10, a.authority.stock.ITEM_SUP_EXP_L);

        const b = await rig({ ITEM_SUP_EXP_M: 100 }, [SR]);
        const r2 = await b.api.cmd<ItemUseResult>('item.use', use('ITEM_SUP_EXP_M', 100, SR));
        if (isApiFail(r2)) throw new Error(r2.message);
        assert.equals(27, r2.result.consumed, 'SR 到 Lv25 要 13,440，ceil(13440 ÷ 500)＝27');
        assert.equals(25, r2.result.level);
    });

    suite.test('傳承後上限提高，同一張卡可以繼續升（limitBreak 由 SUP-3 寫入，這裡直接改實例模擬）', async () => {
        const { api, authority } = await rig({ ITEM_SUP_EXP_L: 30 }, [R]);
        await api.cmd('item.use', use('ITEM_SUP_EXP_L', 30, R));
        assert.equals(20, authority.itemMeta.instances?.[R]?.level);
        authority.itemMeta = { ...authority.itemMeta, instances: { [R]: { level: 20, exp: 0, limitBreak: 1 } } };
        const r = await api.cmd<ItemUseResult>('item.use', use('ITEM_SUP_EXP_L', 1, R));
        if (isApiFail(r)) throw new Error(r.message);
        assert.equals(2000, r.result.expGained);
        assert.isTrue(r.result.level > 20 && r.result.level <= 25);
    });

    suite.test('錯誤路徑整筆不生效：沒有使用效果 E317、目標未持有 E317、目標不是卡 E317、材料不足 E314、數量非法 E001', async () => {
        const { api, authority } = await rig({ ITEM_SUP_EXP_S: 2, ITEM_ADMISSION_TOKEN: 1 });
        const before = JSON.stringify([authority.stock, authority.itemMeta]);
        const noEffect = await api.cmd('item.use', use('ITEM_ADMISSION_TOKEN', 1, SSR));
        assert.isTrue(isApiFail(noEffect) && noEffect.errorCode === 'E317');
        const notHeld = await api.cmd('item.use', use('ITEM_SUP_EXP_S', 1, SR));
        assert.isTrue(isApiFail(notHeld) && notHeld.errorCode === 'E317');
        const notCard = await api.cmd('item.use', use('ITEM_SUP_EXP_S', 1, 'ITEM_SUP_EXP_S'));
        assert.isTrue(isApiFail(notCard) && notCard.errorCode === 'E317');
        const short = await api.cmd('item.use', use('ITEM_SUP_EXP_S', 3, SSR));
        assert.isTrue(isApiFail(short) && short.errorCode === 'E314');
        const badQty = await api.cmd('item.use', use('ITEM_SUP_EXP_S', 0, SSR));
        assert.isTrue(isApiFail(badQty) && badQty.errorCode === 'E001');
        const noTarget = await api.cmd('item.use', { itemId: 'ITEM_SUP_EXP_S', qty: 1 });
        assert.isTrue(isApiFail(noTarget));
        assert.equals(before, JSON.stringify([authority.stock, authority.itemMeta]), '庫存、實例、帳本都沒動');
    });

    suite.test('同 idemKey 重送不重複扣材料（冪等）', async () => {
        const { api, authority } = await rig({ ITEM_SUP_EXP_S: 4 });
        const key = { idemKey: 'use-1' };
        const r1 = await api.cmd<ItemUseResult>('item.use', use('ITEM_SUP_EXP_S', 2, SSR), key);
        const r2 = await api.cmd<ItemUseResult>('item.use', use('ITEM_SUP_EXP_S', 2, SSR), key);
        assert.isTrue(r1.ok);
        assert.isTrue(isApiFail(r2) ? r2.errorCode === 'E101' : r2.ok);
        assert.equals(2, authority.stock.ITEM_SUP_EXP_S, '只扣一次');
    });

    suite.test('真的 GameSession：升級後存檔快照帶新等級；背包材料數量正確', async () => {
        const store = new PlayerSaveService(new MemoryStorageAdapter());
        const bundle = createLocalApi(store, { now: () => 1_000 });
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([]));
        session.setSaveService(store);
        bundle.setItemAuthority(session.itemAuthority());
        bundle.setItemConfig(mergedConfig());
        session.setItemApi(bundle.api);
        await bundle.api.cmd('item.grant', { itemId: SSR, qty: 1, source: 'REWARD' });
        await bundle.api.cmd('item.grant', { itemId: 'ITEM_SUP_EXP_M', qty: 3, source: 'REWARD' });
        const r = await bundle.api.cmd<ItemUseResult>('item.use', use('ITEM_SUP_EXP_M', 2, SSR));
        if (isApiFail(r)) throw new Error(r.message);
        assert.equals(1, session.itemCount('ITEM_SUP_EXP_M'));
        const snap = session.createSnapshot();
        assert.equals(r.result.level, snap.itemMeta?.instances?.[SSR]?.level);
        assert.equals(r.result.exp, snap.itemMeta?.instances?.[SSR]?.exp);
        assert.isTrue((snap.itemMeta?.instances?.[SSR]?.level ?? 0) > 1);
    });

    return suite;
}
