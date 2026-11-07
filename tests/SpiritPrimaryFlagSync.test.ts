/**
 * 英靈卡主卡旗標單一真相：isPrimary 為準，投影時寫出 Family_Primary_Flag（PROG-2-1971）
 */
import { assert, TestSuite } from './TestRunner';
import { deriveInventoryViews, type InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';
import { buildSpiritFamilyState } from '../assets/scripts/core/systems/SpiritFamilyReadModel';
import { buildDeathSpiritCard } from '../assets/scripts/core/systems/SpiritCardDeathSettlement';

function spirit(id: string, over: Partial<InventoryRecord> = {}, attrs: Record<string, unknown> = {}): InventoryRecord {
    return {
        Inventory_ID: id, Item_Type: 'SPIRIT_CARD', Slot_Type: 'DESTINY', Bound_General_UID: null, Quantity: 1,
        Quality: 'SSR', Source_Type: 'DeathSettlement', Display_Bucket: 'DESTINY_SLOT', Is_Displayed: true,
        Attributes: { LineageScore: 10, General_Template_ID: id, Spirit_Family_Key: 'FAMILY_ZHAO', Card_Role: 'BACKUP', DualEquip_Allowed: true, ...attrs },
        ...over,
    };
}

export function createSpiritPrimaryFlagSyncSuite(): TestSuite {
    const suite = new TestSuite('SpiritPrimaryFlagSync (主卡旗標單一真相 PROG-2-1971)');

    suite.test('isPrimary 有值時以它為準，覆蓋舊的 Family_Primary_Flag', () => {
        const views = deriveInventoryViews([
            spirit('S1', { isPrimary: true }, { Family_Primary_Flag: false }),
            spirit('S2', { isPrimary: false }, { Family_Primary_Flag: true }),
        ]);
        assert.equals(true, views.spiritCards.S1.Family_Primary_Flag);
        assert.equals(false, views.spiritCards.S2.Family_Primary_Flag);
    });

    suite.test('只有 isPrimary、沒有屬性旗標的新列可投影', () => {
        const views = deriveInventoryViews([spirit('S1', { isPrimary: true })]);
        assert.equals(0, views.skipped.length);
        assert.equals(true, views.spiritCards.S1.Family_Primary_Flag);
    });

    suite.test('舊列沒有 isPrimary 時沿用屬性旗標；兩者都缺仍跳過不補值', () => {
        const views = deriveInventoryViews([
            spirit('S1', {}, { Family_Primary_Flag: true }),
            spirit('S2'),
        ]);
        assert.equals(true, views.spiritCards.S1.Family_Primary_Flag);
        assert.equals(1, views.skipped.length);
        assert.equals('S2', views.skipped[0].Inventory_ID);
    });

    suite.test('讀模型的主卡跟著 isPrimary 走', () => {
        const views = deriveInventoryViews([
            spirit('S1', { isPrimary: false }, { Family_Primary_Flag: true }),
            spirit('S2', { isPrimary: true }),
        ]);
        const state = buildSpiritFamilyState('FAMILY_ZHAO', Object.values(views.spiritCards));
        assert.equals('S2', state.Active_Main_Spirit_UID);
    });

    suite.test('死亡結算產的新卡只寫 isPrimary', () => {
        const record = buildDeathSpiritCard({ id: 'zhao-yun', templateId: 'zhao-yun', characterCategory: 'famed', status: 'dead' } as never);
        assert.equals(false, record.isPrimary);
        assert.equals(undefined, record.Attributes['Family_Primary_Flag']);
        assert.equals(0, deriveInventoryViews([record]).skipped.length);
    });

    return suite;
}
