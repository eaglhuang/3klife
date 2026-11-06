/**
 * SpiritCardMerge — 英靈卡唯一性與覆蓋：同模板只留一張、數值取高、LineageScore 累加、階位不倒退（SPI-02；PROG-2-1922）
 */
import { assert, TestSuite } from './TestRunner';
import { mergeSpiritCard, upsertSpiritCard } from '../assets/scripts/core/systems/SpiritCardMerge';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';

function card(id: string, templateId: string, attrs: Record<string, unknown>, extra: Partial<InventoryRecord> = {}): InventoryRecord {
    return {
        Inventory_ID: id, Item_Type: 'SPIRIT_CARD', Slot_Type: 'DESTINY', Bound_General_UID: null, Quantity: 1,
        Quality: 'SSR', Source_Type: 'DEATH', Display_Bucket: 'SELF', Is_Displayed: true,
        Attributes: { General_Template_ID: templateId, Spirit_Family_Key: 'f', Card_Role: 'MAIN', Family_Primary_Flag: true, DualEquip_Allowed: true, ...attrs },
        ...extra,
    } as InventoryRecord;
}

export function createSpiritCardMergeSuite(): TestSuite {
    const suite = new TestSuite('SpiritCardMerge (英靈卡唯一性與覆蓋 SPI-02 PROG-2-1922)');

    suite.test('同模板再死亡：覆蓋舊卡不新增，數值取高、LineageScore 累加、階位不倒退', () => {
        const old = card('sc-1', 'guan-yu', { LineageScore: 100, Final_Stats: { str: 95, int: 70 }, Ancestor_Tier: 3 }, { isPrimary: true, equippedBy: 'kid' });
        const other = card('sc-2', 'zhang-fei', { LineageScore: 50 });
        const incoming = card('sc-new', 'guan-yu', { LineageScore: 40, Final_Stats: { str: 90, int: 80, lea: 88 }, Ancestor_Tier: 2 });
        const r = upsertSpiritCard([old, other], incoming);
        assert.isTrue(r.merged);
        assert.equals(2, r.records.length);
        const merged = r.records[0];
        assert.equals('sc-1', merged.Inventory_ID);
        assert.equals(140, merged.Attributes['LineageScore']);
        assert.equals(JSON.stringify({ str: 95, int: 80, lea: 88 }), JSON.stringify(merged.Attributes['Final_Stats']));
        assert.equals(3, merged.Attributes['Ancestor_Tier']);
        assert.isTrue(merged.isPrimary === true);
        assert.equals('kid', merged.equippedBy);
        assert.equals(100, old.Attributes['LineageScore']);
    });

    suite.test('沒有同模板英靈卡就新增；非英靈卡列不會被當成同模板', () => {
        const tally = { ...card('t-1', 'guan-yu', {}), Item_Type: 'TALLY' } as InventoryRecord;
        const r = upsertSpiritCard([tally], card('sc-1', 'guan-yu', { LineageScore: 10 }));
        assert.isFalse(r.merged);
        assert.equals(2, r.records.length);
        const m = mergeSpiritCard(card('a', 'x', { LineageScore: 5 }), card('b', 'x', {}));
        assert.equals(5, m.Attributes['LineageScore']);
        assert.equals(undefined, m.Attributes['Final_Stats']);
    });

    return suite;
}
