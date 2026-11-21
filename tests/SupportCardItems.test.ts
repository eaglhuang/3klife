/**
 * SupportCardItems.test.ts — 學府支援卡資料與物品化（PROG-2-9240 SUP-1；doc_spec_1264 §4、§14、§19、TC-SUP-02）
 *
 * 鎖住：25 張卡的資料與分布（稀有度、類、師承、事件 57 段）、卡 → 物品定義的推導（unique、綁家庭倉庫、academyOnly）、
 * 發放時建立實例狀態（Lv1／經驗 0／傳承 0）、同卡不能重複入庫、出征編制讀物品時排除支援卡、實例狀態隨存檔保存。
 *
 * Unity 對照：像卡牌資料庫的 EditMode 契約測試，加一條「牌庫存取」的整合測試。
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
import type { ItemGrantResult, ItemListResult } from '../assets/scripts/shared/api/ApiCommands';
import { DEFAULT_ITEM_CONFIG, normalizeItemConfig, type HolderRef, type ItemConfigV1 } from '../assets/scripts/shared/item/ItemConfig';
import { emptyItemMeta, isDeployableItem, normalizeItemMeta, type ItemMeta } from '../assets/scripts/shared/item/ItemRules';
import {
    normalizeSupportCards, supportCardItemDefs, supportItemIdOf, SUPPORT_CARD_CATEGORY,
    type SupportCardsConfigV1,
} from '../assets/scripts/shared/support/SupportCardConfig';
import { DEFAULT_SUPPORT_RULES, withSupportItems } from '../assets/scripts/shared/support/SupportRules';

const ROOT = path.join(__dirname, '..');
const HOME: HolderRef = { kind: 'household', id: 'home' };

function loadCards(): SupportCardsConfigV1 {
    const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/academy-support-cards.json'), 'utf8')) as unknown;
    return normalizeSupportCards(raw);
}

function mergedConfig(): ItemConfigV1 {
    return withSupportItems(DEFAULT_ITEM_CONFIG, loadCards(), DEFAULT_SUPPORT_RULES);
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

function rig() {
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
    const authority = new MemoryAuthority();
    bundle.setItemAuthority(authority);
    bundle.setItemConfig(mergedConfig());
    return { api: bundle.api, authority, bundle };
}

const grantCard = (itemId: string, source = 'REWARD') => ({ itemId, qty: 1, source });

function count<T>(list: readonly T[], pick: (v: T) => string): Record<string, number> {
    const out: Record<string, number> = {};
    for (const v of list) out[pick(v)] = (out[pick(v)] ?? 0) + 1;
    return out;
}

export function createSupportCardItemsSuite(): TestSuite {
    const suite = new TestSuite('SupportCardItems (學府支援卡資料與物品化 PROG-2-9240 SUP-1)');

    suite.test('academy-support-cards.json：25 張卡全數通過正規化，稀有度 SSR7／SR11／R7，三類 11／8／6，事件 57 段', () => {
        const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/academy-support-cards.json'), 'utf8')) as { cards: unknown[] };
        const cfg = loadCards();
        assert.equals(25, raw.cards.length);
        assert.equals(25, cfg.cards.length, '沒有任何卡被正規化丟掉');
        assert.equals(JSON.stringify(raw.cards), JSON.stringify(cfg.cards), '正規化不改內容');
        assert.equals(JSON.stringify({ SSR: 7, SR: 11, R: 7 }), JSON.stringify(count(cfg.cards, (c) => c.rarity)));
        assert.equals(JSON.stringify({ sage: 11, general: 8, beauty: 6 }), JSON.stringify(count(cfg.cards, (c) => c.kind)));
        assert.equals(57, cfg.cards.reduce((n, c) => n + c.events.length, 0));
        assert.equals(25, new Set(cfg.cards.map((c) => c.cardId)).size, 'cardId 不重複');
        assert.equals(25, new Set(cfg.cards.map((c) => c.itemId)).size, 'itemId 不重複');
    });

    suite.test('分布符合規格第 14 章：師承 5／5／4／7／4、五種課堂與八種主屬性都有卡、事件數 3（SSR）／2', () => {
        const cfg = loadCards();
        assert.equals(5, cfg.cards.filter((c) => c.school === '水鏡門下').length);
        assert.equals(5, cfg.cards.filter((c) => c.school === '鄭學').length);
        assert.equals(4, cfg.cards.filter((c) => c.school === '黃老').length);
        assert.equals(7, cfg.cards.filter((c) => c.school === '兵家').length);
        assert.equals(4, cfg.cards.filter((c) => c.school === '散修').length);
        assert.equals(5, new Set(cfg.cards.map((c) => c.favoredCourse)).size);
        assert.equals(8, new Set(cfg.cards.map((c) => c.focus)).size);
        for (const c of cfg.cards) {
            assert.equals(c.rarity === 'SSR' ? 3 : 2, c.events.length, `${c.cardId} 事件數`);
            assert.equals(c.events.length, c.events.filter((e, i) => e === `SUPEVT_${c.cardId.slice(4)}_${i + 1}`).length, `${c.cardId} 事件 id 規則`);
            assert.equals(supportItemIdOf(c.cardId), c.itemId);
            assert.equals('academyOnly', c.usage);
        }
        const sunBin = cfg.cards.find((c) => c.cardId === 'SUP_SUN_BIN');
        const wuQi = cfg.cards.find((c) => c.cardId === 'SUP_WU_QI');
        assert.equals(1.1, sunBin?.mult);
        assert.equals(0.9, wuQi?.mult);
        assert.equals('D', sunBin?.role, '點撥型＝D');
        assert.equals('C', cfg.cards.find((c) => c.cardId === 'SUP_HUA_TUO')?.role, '養生型＝C');
    });

    suite.test('武將特別版與紅顏教官都有投影人物；名冊同名的名師也填（華佗、左慈）', () => {
        const cfg = loadCards();
        for (const c of cfg.cards.filter((x) => x.kind !== 'sage')) assert.isTrue(c.projectionOf !== null, `${c.cardId} 要有投影人物`);
        assert.equals('hua-tuo', cfg.cards.find((c) => c.cardId === 'SUP_HUA_TUO')?.projectionOf);
        assert.equals('zuo-ci', cfg.cards.find((c) => c.cardId === 'SUP_ZUO_CI')?.projectionOf);
        const generals = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/generals.json'), 'utf8')) as Array<{ id: string }>;
        const ids = new Set((Array.isArray(generals) ? generals : []).map((g) => g.id));
        for (const c of cfg.cards.filter((x) => x.projectionOf !== null)) assert.isTrue(ids.has(c.projectionOf as string), `${c.cardId} 的投影人物 ${c.projectionOf} 存在於名冊`);
    });

    suite.test('壞設定不丟例外：非物件回空設定；欄位不合法、itemId 對不上、重複 cardId、缺投影的卡被丟掉', () => {
        assert.equals(0, normalizeSupportCards(null).cards.length);
        const good = loadCards().cards[0];
        const bad = normalizeSupportCards({
            cards: [
                good, good,
                { ...good, cardId: 'SUP_X1', itemId: supportItemIdOf('SUP_X1'), rarity: 'UR' },
                { ...good, cardId: 'SUP_X2', itemId: 'WRONG' },
                { ...good, cardId: 'SUP_X3', itemId: supportItemIdOf('SUP_X3'), kind: 'general', projectionOf: null },
                { ...good, cardId: 'SUP_X4', itemId: supportItemIdOf('SUP_X4'), mult: 2 },
            ],
        });
        assert.equals(1, bad.cards.length);
    });

    suite.test('卡 → 物品定義：unique 上限 1、綁家庭倉庫、不折金、academyOnly、category=supportCard、稀有度 R1／SR2／SSR3', () => {
        const cfg = loadCards();
        const defs = supportCardItemDefs(cfg);
        assert.equals(25, defs.length);
        for (const d of defs) {
            assert.equals('card', d.kind);
            assert.equals('unique', d.stack.mode);
            assert.equals(1, d.stack.max);
            assert.equals('household', d.bind);
            assert.equals(null, d.overflow);
            assert.equals(SUPPORT_CARD_CATEGORY, d.category);
            assert.equals('academyOnly', d.usage);
            assert.equals(JSON.stringify({ level: 1, exp: 0, limitBreak: 0 }), JSON.stringify(d.instanceState));
        }
        assert.equals(3, defs.find((d) => d.id === 'ITEM_SUPCARD_SIMA_HUI')?.rarity);
        assert.equals(1, defs.find((d) => d.id === 'ITEM_SUPCARD_MA_RONG')?.rarity);
        // 單一真相：item-config.json 不重複列卡
        const itemJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/item-config.json'), 'utf8')) as { items: Array<{ id: string }> };
        assert.equals(0, itemJson.items.filter((i) => i.id.startsWith('ITEM_SUPCARD_')).length);
        assert.equals(DEFAULT_ITEM_CONFIG.items.length + 25 + 4, mergedConfig().items.length, '25 張卡＋4 種經驗材料');
    });

    suite.test('設定來回：unique 與 instanceState 經 normalizeItemConfig 後不變；沒有 unique 時 instanceState 被忽略', () => {
        const merged = mergedConfig();
        assert.equals(JSON.stringify(merged), JSON.stringify(normalizeItemConfig(JSON.parse(JSON.stringify(merged)))));
        const odd = normalizeItemConfig({
            ...DEFAULT_ITEM_CONFIG,
            items: [{ id: 'X', kind: 'consumable', stack: { mode: 'stackable', max: 5 }, bind: 'none', overflow: null, instanceState: { level: 9, exp: 0, limitBreak: 0 } }],
        });
        assert.equals(undefined, odd.items[0].instanceState);
    });

    suite.test('item.grant 發卡：入庫一件、建立 Lv1 實例；同卡再發整筆失敗 E313 且實例不變', async () => {
        const { api, authority } = rig();
        const id = 'ITEM_SUPCARD_SIMA_HUI';
        const r1 = await api.cmd<ItemGrantResult>('item.grant', grantCard(id));
        if (isApiFail(r1)) throw new Error(r1.message);
        assert.equals(1, r1.result.count);
        assert.equals(1, authority.stock[id]);
        assert.equals(JSON.stringify({ level: 1, exp: 0, limitBreak: 0 }), JSON.stringify(authority.itemMeta.instances?.[id]));
        const again = await api.cmd('item.grant', grantCard(id));
        assert.isTrue(isApiFail(again) && again.errorCode === 'E313', '重複卡不由物品層處置（傳承在 SUP-3）');
        assert.equals(1, authority.stock[id]);
        const count1 = await api.query<{ count: number }>('item.count', { itemId: id });
        assert.isTrue(count1.ok && count1.result.count === 1);
    });

    suite.test('支援卡只能放家庭倉庫：放到武將背包整筆拒絕（綁定／容器不接受）', async () => {
        const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
        class Two extends MemoryAuthority {
            public bag: Record<string, number> = {};
            public read(holder: HolderRef, container: string): StockTable | null {
                if (holder.kind === 'general' && container === 'bag') return { ...this.bag };
                return super.read(holder, container);
            }
        }
        bundle.setItemAuthority(new Two());
        bundle.setItemConfig({
            ...mergedConfig(),
            holders: [
                ...mergedConfig().holders,
                { kind: 'general', aliasKey: 'holder.general.name', containers: [{ id: 'bag', accepts: ['card'], capacity: null }] },
            ],
        });
        const res = await bundle.api.cmd('item.grant', { itemId: 'ITEM_SUPCARD_SIMA_HUI', qty: 1, source: 'REWARD', holder: { kind: 'general', id: 'g1' }, container: 'bag' });
        assert.isTrue(isApiFail(res) && res.errorCode === 'E312', '綁定家庭：E312');
    });

    suite.test('TC-SUP-02：出征／守城／派遣編制讀物品（item.list forDeploy）支援卡為 0；一般列表仍看得到', async () => {
        const { api } = rig();
        await api.cmd('item.grant', grantCard('ITEM_SUPCARD_SIMA_HUI'));
        await api.cmd('item.grant', grantCard('ITEM_SUPCARD_MA_RONG'));
        await api.cmd('item.grant', { itemId: 'ITEM_ADMISSION_TOKEN', qty: 1, source: 'SYSTEM' });
        const all = await api.query<ItemListResult>('item.list', {});
        if (isApiFail(all)) throw new Error(all.message);
        assert.equals(3, all.result.rows.length);
        const cardRow = all.result.rows.find((r) => r.itemId === 'ITEM_SUPCARD_SIMA_HUI');
        assert.equals('supportCard', cardRow?.category);
        assert.equals(1, cardRow?.instance?.level);
        const deploy = await api.query<ItemListResult>('item.list', { forDeploy: true });
        if (isApiFail(deploy)) throw new Error(deploy.message);
        assert.equals(1, deploy.result.rows.length);
        assert.equals('ITEM_ADMISSION_TOKEN', deploy.result.rows[0].itemId);
        const cfg = mergedConfig();
        for (const d of supportCardItemDefs(loadCards())) assert.isFalse(isDeployableItem(cfg, d.id), `${d.id} 不可進出征編制`);
        assert.isTrue(isDeployableItem(cfg, 'ITEM_ADMISSION_TOKEN'));
        assert.isTrue(isDeployableItem(cfg, 'ITEM_UNKNOWN_LEGACY'), '舊存檔未知物品視為可用，行為不變');
    });

    suite.test('卡數量歸零（item.consume）時實例狀態一併移除；再入庫重新從 Lv1 起算', async () => {
        const { api, authority } = rig();
        const id = 'ITEM_SUPCARD_HUA_TUO';
        await api.cmd('item.grant', grantCard(id));
        authority.itemMeta = { ...authority.itemMeta, instances: { [id]: { level: 12, exp: 40, limitBreak: 2 } } };
        const gone = await api.cmd('item.consume', { itemId: id, qty: 1, sink: 'MIGRATE' });
        assert.isTrue(gone.ok);
        assert.equals(undefined, authority.itemMeta.instances?.[id]);
        await api.cmd('item.grant', grantCard(id));
        assert.equals(1, authority.itemMeta.instances?.[id]?.level);
    });

    suite.test('itemMeta 正規化保留實例狀態；壞值補預設；沒有實例時不多出欄位（舊檔形狀不變）', () => {
        assert.equals(undefined, normalizeItemMeta(emptyItemMeta()).instances);
        const meta = normalizeItemMeta({ v: 1, periodic: {}, ledger: [], seq: 0, instances: { A: { level: 7, exp: 30, limitBreak: 2 }, B: { level: -3, exp: 'x' }, C: null } });
        assert.equals(JSON.stringify({ level: 7, exp: 30, limitBreak: 2 }), JSON.stringify(meta.instances?.A));
        assert.equals(JSON.stringify({ level: 1, exp: 0, limitBreak: 0 }), JSON.stringify(meta.instances?.B));
        assert.equals(undefined, meta.instances?.C);
    });

    suite.test('真的 GameSession：發卡後家庭倉庫有卡，存檔快照帶 itemMeta.instances，讀回形狀一致', async () => {
        const store = new PlayerSaveService(new MemoryStorageAdapter());
        const bundle = createLocalApi(store, { now: () => 1_000 });
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([]));
        session.setSaveService(store);
        bundle.setItemAuthority(session.itemAuthority());
        bundle.setItemConfig(mergedConfig());
        session.setItemApi(bundle.api);
        const res = await bundle.api.cmd('item.grant', grantCard('ITEM_SUPCARD_ZHENG_XUAN'));
        assert.isTrue(res.ok);
        assert.equals(1, session.itemCount('ITEM_SUPCARD_ZHENG_XUAN'));
        const snap = session.createSnapshot();
        assert.equals(1, snap.itemMeta?.instances?.ITEM_SUPCARD_ZHENG_XUAN?.level);
        assert.equals(1, snap.inventory?.ITEM_SUPCARD_ZHENG_XUAN);
        const again = normalizeItemMeta(JSON.parse(JSON.stringify(snap.itemMeta)));
        assert.equals(JSON.stringify(snap.itemMeta?.instances), JSON.stringify(again.instances));
    });

    return suite;
}
