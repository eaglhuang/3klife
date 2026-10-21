import { assert, TestSuite } from './TestRunner';
import { deriveInventoryViews, InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';

const TALLY_ATTRS = {
    TigerTallyScore: 120,
    Star: 2,
    Star_Exp: 30,
    Source_Template_ID: 'Zhao_Yun_V2',
    Source_General_UID: 'G001',
    Acquired_Season: 3,
};

const SPIRIT_ATTRS = {
    LineageScore: 80,
    General_Template_ID: 'Zhao_Yun_V2',
    Spirit_Family_Key: 'ZHAO',
    Card_Role: 'MAIN',
    Family_Primary_Flag: true,
    DualEquip_Allowed: false,
};

function tally(overrides: Partial<InventoryRecord> = {}): InventoryRecord {
    return {
        Inventory_ID: 'T-1',
        Item_Type: 'TALLY',
        Slot_Type: 'TALLY_SLOT',
        Bound_General_UID: 'G001',
        Quantity: 1,
        Quality: 'SR',
        Source_Type: 'Recruitment',
        Display_Bucket: 'TALLY',
        Is_Displayed: true,
        Attributes: { ...TALLY_ATTRS },
        ...overrides,
    };
}

function spirit(overrides: Partial<InventoryRecord> = {}): InventoryRecord {
    return {
        Inventory_ID: 'S-1',
        Item_Type: 'SPIRIT_CARD',
        Slot_Type: 'DESTINY',
        Bound_General_UID: null,
        Quantity: 1,
        Quality: 'SSR',
        Source_Type: 'DeathSettlement',
        Display_Bucket: 'DESTINY_SLOT',
        Is_Displayed: true,
        Attributes: { ...SPIRIT_ATTRS },
        ...overrides,
    };
}

export function createInventoryProjectionSuite(): TestSuite {
    const suite = new TestSuite('InventoryProjection (DS-08 統一物件庫推導視圖)');

    suite.test('虎符與英靈卡都由統一物件庫推導，OTHER 列不進任何視圖', () => {
        const views = deriveInventoryViews([
            tally(),
            spirit(),
            { ...tally(), Inventory_ID: 'X-1', Item_Type: 'OTHER' },
        ]);
        assert.equals(1, Object.keys(views.talismans).length);
        assert.equals(1, Object.keys(views.spiritCards).length);
        assert.equals(0, views.skipped.length);
        assert.equals('T-1', views.talismans['T-1'].Tally_ID);
        assert.equals('G001', views.talismans['T-1'].Equipped_General_UID ?? '');
        assert.equals('S-1', views.spiritCards['S-1'].Spirit_ID);
        assert.equals(null, views.spiritCards['S-1'].Equipped_General_UID);
    });

    suite.test('推導結果是副本：改動視圖不影響來源列', () => {
        const source = [tally()];
        const views = deriveInventoryViews(source);
        views.talismans['T-1'].Star = 9;
        assert.equals(2, source[0].Attributes.Star as number);
    });

    suite.test('缺欄位或數值不合法的列跳過並記錄原因，不補預設值', () => {
        const views = deriveInventoryViews([
            tally({ Inventory_ID: 'T-2', Attributes: { ...TALLY_ATTRS, Star: undefined } }),
            tally({ Inventory_ID: 'T-3', Quality: 'Z' }),
            tally({ Inventory_ID: 'T-4', Quantity: 2 }),
            spirit({ Inventory_ID: 'S-2', Slot_Type: 'BAG' }),
        ]);
        assert.equals(0, Object.keys(views.talismans).length);
        assert.equals(0, Object.keys(views.spiritCards).length);
        assert.equals(4, views.skipped.length);
        assert.equals('T-2', views.skipped[0].Inventory_ID);
    });

    suite.test('重複的 Inventory_ID 只取第一筆，其餘記為跳過', () => {
        const views = deriveInventoryViews([tally(), tally({ Star: 0 } as Partial<InventoryRecord>)]);
        assert.equals(1, Object.keys(views.talismans).length);
        assert.equals(2, views.talismans['T-1'].Star);
        assert.equals(1, views.skipped.length);
        assert.equals('重複的 Inventory_ID', views.skipped[0].reason);
    });

    suite.test('未綁定的虎符 Equipped_General_UID 為 null（君主持有）', () => {
        const views = deriveInventoryViews([tally({ Bound_General_UID: null })]);
        assert.equals(null, views.talismans['T-1'].Equipped_General_UID);
    });

    return suite;
}
