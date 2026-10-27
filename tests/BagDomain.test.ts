/**
 * BagDomain.test.ts — 統一物件庫顯示分域（PROG-2-1031，BAG-10）
 *
 * 鎖住：虎符與英靈卡不進一般格；一般道具進一般格；格數以列計算，不因數量堆疊而增加。
 */
import { TestSuite, assert } from './TestRunner';
import { bagDomainOf, countGeneralBagSlots } from '../assets/scripts/core/systems/BagDomain';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';

function record(id: string, itemType: InventoryRecord['Item_Type'], quantity = 1): InventoryRecord {
    return {
        Inventory_ID: id,
        Item_Type: itemType,
        Slot_Type: 'NONE',
        Bound_General_UID: null,
        Quantity: quantity,
        Quality: 'SR',
        Source_Type: 'TEST',
        Display_Bucket: 'TEST',
        Is_Displayed: true,
        Attributes: {},
    };
}

export function createBagDomainSuite(): TestSuite {
    const suite = new TestSuite('BagDomain (統一物件庫顯示分域 PROG-2-1031)');

    suite.test('虎符進虎符槽、英靈卡進英靈槽、一般道具進一般格', () => {
        assert.equals('TALLY_SLOT', bagDomainOf(record('a', 'TALLY')));
        assert.equals('SPIRIT_SLOT', bagDomainOf(record('b', 'SPIRIT_CARD')));
        assert.equals('GENERAL_BAG', bagDomainOf(record('c', 'OTHER')));
    });

    suite.test('一般格只計一般道具，虎符與英靈卡不占格', () => {
        const records = [record('t1', 'TALLY'), record('s1', 'SPIRIT_CARD'), record('o1', 'OTHER'), record('o2', 'OTHER')];
        assert.equals(2, countGeneralBagSlots(records));
    });

    suite.test('數量堆疊在同一列內，不增加格數', () => {
        assert.equals(1, countGeneralBagSlots([record('o1', 'OTHER', 99)]));
    });

    suite.test('空清單為 0 格', () => {
        assert.equals(0, countGeneralBagSlots([]));
    });

    return suite;
}
