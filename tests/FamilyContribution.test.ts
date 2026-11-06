/**
 * FamilyContribution — 家族供養只灌主卡、CardGrowth=min(cap,pool)、餘量留池（SPI-06；PROG-2-1927）
 */
import { assert, TestSuite } from './TestRunner';
import { feedFamilyPrimaryCard, settleFamilyGrowth } from '../assets/scripts/core/systems/FamilyContribution';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';

function card(id: string, family: string, primary: boolean, growth: number, cap: number): InventoryRecord {
    return {
        Inventory_ID: id, Item_Type: 'SPIRIT_CARD', Slot_Type: 'DESTINY', Bound_General_UID: null, Quantity: 1,
        Quality: 'SSR', Source_Type: 'DEATH', Display_Bucket: 'SELF', Is_Displayed: true,
        Attributes: { Spirit_Family_Key: family, Card_Growth: growth, Card_Growth_Cap: cap },
        isPrimary: primary ? true : null,
    } as unknown as InventoryRecord;
}

export function createFamilyContributionSuite(): TestSuite {
    const suite = new TestSuite('FamilyContribution (家族供養灌主卡 SPI-06 PROG-2-1927)');

    suite.test('CardGrowth = min(剩餘上限, 池)', () => {
        assert.equals(JSON.stringify({ cardGrowth: 30, poolRemaining: 0 }), JSON.stringify(settleFamilyGrowth(50, 30)));
        assert.equals(JSON.stringify({ cardGrowth: 50, poolRemaining: 20 }), JSON.stringify(settleFamilyGrowth(50, 70)));
        assert.equals(JSON.stringify({ cardGrowth: 0, poolRemaining: 10 }), JSON.stringify(settleFamilyGrowth(-5, 10)));
    });

    suite.test('只灌主卡：副卡與他族不變，封頂後餘量留池；沒主卡就不灌', () => {
        const main = card('m', 'cao', true, 80, 100);
        const sub = card('s', 'cao', false, 10, 100);
        const other = card('o', 'liu', true, 0, 100);
        const r = feedFamilyPrimaryCard([main, sub, other], 'cao', 50);
        assert.equals('m', r.primaryId);
        assert.equals(20, r.cardGrowth);
        assert.equals(30, r.poolRemaining);
        assert.equals(100, r.records[0].Attributes['Card_Growth']);
        assert.equals(10, r.records[1].Attributes['Card_Growth']);
        assert.equals(0, r.records[2].Attributes['Card_Growth']);
        assert.equals(80, main.Attributes['Card_Growth']);
        const none = feedFamilyPrimaryCard([sub], 'cao', 50);
        assert.equals(null, none.primaryId);
        assert.equals(50, none.poolRemaining);
    });

    return suite;
}
