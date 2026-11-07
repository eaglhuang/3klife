/**
 * MultiSpiritCardBalance — 多家族英靈卡不線性疊加的平衡檢查（TSK-13；PROG-2-1966）
 *
 * 同一家族擁有很多英靈卡時，不能因卡多而加成線性堆高：
 * 一將一命槽、FAMILY 共鳴封頂、家族池只灌主卡、低品質成員回向封頂。
 */
import { assert, TestSuite } from './TestRunner';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';
import { insertSpiritCard } from '../assets/scripts/core/systems/SpiritSlotFlow';
import { SPIRIT_SLOT_ID } from '../assets/scripts/core/systems/SpiritSlotState';
import { resonanceBandOf, resonanceBonus } from '../assets/scripts/core/systems/SpiritResonance';
import { feedFamilyPrimaryCard } from '../assets/scripts/core/systems/FamilyContribution';
import { qualityWeightedReturn } from '../assets/scripts/core/systems/ClanFirewall';

function spiritCard(id: string, overrides: Partial<InventoryRecord> = {}): InventoryRecord {
    return {
        Inventory_ID: id,
        Item_Type: 'SPIRIT_CARD',
        Slot_Type: 'SPIRIT',
        Bound_General_UID: null,
        Quantity: 1,
        Quality: 'N',
        Source_Type: 'TEST',
        Display_Bucket: 'SPIRIT',
        Is_Displayed: true,
        Attributes: { Spirit_Family_Key: 'FAMILY_CAO', Card_Growth: 0, Card_Growth_Cap: 100 },
        equippedBy: null,
        slotId: null,
        ...overrides,
    };
}

const BONUS = { full: 0.2, family: 0.15, familyCap: 0.1, echo: 0.03 };

export function createMultiSpiritCardBalanceSuite(): TestSuite {
    const suite = new TestSuite('MultiSpiritCardBalance (多家族卡平衡 TSK-13 PROG-2-1966)');

    suite.test('一將一命槽：第二張同家族卡插不進同一武將', () => {
        const records = [
            spiritCard('S-1', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID }),
            spiritCard('S-2'),
        ];
        const second = insertSpiritCard(records, 'G-1', 'S-2', false);
        assert.isFalse(second.ok);
        if (!second.ok) assert.equals('SLOT_OCCUPIED', second.reason);
    });

    suite.test('全隊十人各插同家族卡：每人加成封頂，總和只隨人數而非卡數成長', () => {
        const card = { General_Template_ID: 'CAO_CAO_01', Spirit_Family_Key: 'FAMILY_CAO' };
        const perHead = resonanceBonus(resonanceBandOf(card, { templateId: 'CAO_PI_01', familyKey: 'FAMILY_CAO' }), BONUS);
        assert.equals(BONUS.familyCap, perHead);
        assert.isTrue(perHead < BONUS.full);
        const ownSelf = resonanceBonus(resonanceBandOf(card, { templateId: 'CAO_CAO_01', familyKey: 'FAMILY_CAO' }), BONUS);
        assert.equals(BONUS.full, ownSelf);
    });

    suite.test('家族池只灌主卡：十張副卡不分池，主卡封頂後池保留', () => {
        const records = [
            spiritCard('MAIN', { isPrimary: true }),
            ...Array.from({ length: 10 }, (_, i) => spiritCard(`B-${i}`)),
        ];
        const fed = feedFamilyPrimaryCard(records, 'FAMILY_CAO', 250);
        assert.equals('MAIN', fed.primaryId);
        assert.equals(100, fed.cardGrowth);
        assert.equals(150, fed.poolRemaining);
        const backupsGrown = fed.records.filter((r) => r.Inventory_ID !== 'MAIN' && r.Attributes['Card_Growth'] !== 0);
        assert.equals(0, backupsGrown.length);
    });

    suite.test('低品質成員數量翻倍，回向不跟著翻倍', () => {
        const high = { qualityWeight: 10, lowQuality: false };
        const lows = (n: number) => Array.from({ length: n }, () => ({ qualityWeight: 1, lowQuality: true }));
        const with20 = qualityWeightedReturn([high, ...lows(20)], 0.5);
        const with40 = qualityWeightedReturn([high, ...lows(40)], 0.5);
        assert.equals(with20, with40);
        assert.isTrue(with40 < 10 + 40);
    });

    return suite;
}
