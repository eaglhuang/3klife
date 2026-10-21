/**
 * InventoryRecordBridge.test.ts — 虎符卡轉統一物件庫 TALLY 列的純邏輯測試（DS-08 儲存段，PROG-2-1021）
 *
 * 鎖住：來源映射（death／reward／surrender）、retire 不產生列、持有者對應到 Bound_General_UID、
 * 推導出的虎符視圖欄位正確，且存檔讀回時形狀不合的列會被丟棄。
 *
 * Unity 對照：像把卡牌資產轉成背包表的一行，表格只在這裡填寫，之後 UI 只讀表格。
 */
import { TestSuite, assert } from './TestRunner';
import type { TigerTallyCard } from '../assets/scripts/core/models/TigerTallyCard';
import { deriveInventoryViews } from '../assets/scripts/core/systems/InventoryProjection';
import { buildTallyInventoryRecords, normalizeInventoryRecords, tallyCardToInventoryRecord } from '../assets/scripts/core/systems/InventoryRecordBridge';

function card(uid: string, source: TigerTallyCard['source'] = 'death', extra: Partial<TigerTallyCard> = {}): TigerTallyCard {
    return { uid, templateId: 'tpl-' + uid, sourceGeneralUid: 'src-' + uid, quality: 'SR', score: 78, source, producedSeason: 9, ...extra };
}

export function createInventoryRecordBridgeSuite(): TestSuite {
    const suite = new TestSuite('InventoryRecordBridge (虎符列映射 DS-08)');

    suite.test('來源映射：death → DeathSettlement、reward → WarConquest、surrender → Recruitment', () => {
        assert.equals('DeathSettlement', tallyCardToInventoryRecord(card('t1', 'death'), null)?.Source_Type ?? '');
        assert.equals('WarConquest', tallyCardToInventoryRecord(card('t2', 'reward'), null)?.Source_Type ?? '');
        assert.equals('Recruitment', tallyCardToInventoryRecord(card('t3', 'surrender'), null)?.Source_Type ?? '');
    });

    suite.test('retire 不產生列（PM 裁定：退役不發虎符）', () => {
        assert.equals(null, tallyCardToInventoryRecord(card('t1', 'retire'), null));
        const records = buildTallyInventoryRecords({ t1: card('t1', 'retire'), t2: card('t2', 'death') }, {});
        assert.equals(1, records.length);
        assert.equals('t2', records[0].Inventory_ID);
    });

    suite.test('持有者對應到 Bound_General_UID；未持有為 null，數量固定為 1', () => {
        const held = tallyCardToInventoryRecord(card('t1'), 'liu-bei');
        assert.equals('liu-bei', held?.Bound_General_UID ?? '');
        assert.equals(1, held?.Quantity ?? 0);
        assert.equals('TALLY', held?.Item_Type ?? '');
        const free = tallyCardToInventoryRecord(card('t2'), null);
        assert.equals(null, free?.Bound_General_UID ?? null);
    });

    suite.test('數值欄位對應卡片；舊卡缺 stars／battleExp 時補 1★ 與 0 經驗', () => {
        const record = tallyCardToInventoryRecord(card('t1', 'death', { stars: 3, battleExp: 240, troopType: 'CAVALRY' }), 'g');
        assert.equals(3, record?.Attributes.Star as number);
        assert.equals(240, record?.Attributes.Star_Exp as number);
        assert.equals('CAVALRY', record?.Attributes.Troop_Type as string);
        const legacy = tallyCardToInventoryRecord(card('t2'), null);
        assert.equals(1, legacy?.Attributes.Star as number);
        assert.equals(0, legacy?.Attributes.Star_Exp as number);
    });

    suite.test('經 deriveInventoryViews 讀回：虎符視圖帶出來源、持有者與季數', () => {
        const records = buildTallyInventoryRecords({ t1: card('t1', 'reward') }, { t1: 'liu-bei' });
        const views = deriveInventoryViews(records);
        assert.equals(0, views.skipped.length);
        const entry = views.talismans.t1;
        assert.equals('WarConquest', entry.Source_Type);
        assert.equals('liu-bei', entry.Equipped_General_UID ?? '');
        assert.equals(9, entry.Acquired_Season);
        assert.equals('SR', entry.Quality);
    });

    suite.test('buildTallyInventoryRecords 順序固定（依 uid 排序），同樣狀態產生同樣的列', () => {
        const a = buildTallyInventoryRecords({ b: card('b'), a: card('a') }, {});
        const b = buildTallyInventoryRecords({ a: card('a'), b: card('b') }, {});
        assert.equals(JSON.stringify(a), JSON.stringify(b));
        assert.equals('a', a[0].Inventory_ID);
    });

    suite.test('normalizeInventoryRecords：非陣列為空；形狀不合的列丟棄，合格的列原樣保留', () => {
        assert.equals(0, normalizeInventoryRecords(undefined).length);
        assert.equals(0, normalizeInventoryRecords({ Inventory_ID: 'x' }).length);
        const good = tallyCardToInventoryRecord(card('t1'), null);
        const raw = [good, { Inventory_ID: 't2', Item_Type: 'BOGUS' }, null, { ...good, Quantity: 'one' }];
        const loaded = normalizeInventoryRecords(raw);
        assert.equals(1, loaded.length);
        assert.equals('t1', loaded[0].Inventory_ID);
    });

    suite.test('normalizeInventoryRecords 複製 Attributes，改動讀回的列不影響原物件', () => {
        const good = tallyCardToInventoryRecord(card('t1'), null);
        if (!good) throw new Error('映射不應為 null');
        const [loaded] = normalizeInventoryRecords([good]);
        (loaded.Attributes as Record<string, unknown>).Star = 5;
        assert.equals(1, good.Attributes.Star as number);
    });

    return suite;
}
