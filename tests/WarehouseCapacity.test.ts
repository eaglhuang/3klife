import { assert, TestSuite } from './TestRunner';
import {
    canExpandWarehouse,
    storeIntoWarehouse,
    warehouseCapacity,
    WAREHOUSE_MAX_SLOTS,
} from '../assets/scripts/core/systems/WarehouseCapacity';

export function createWarehouseCapacitySuite(): TestSuite {
    const suite = new TestSuite('WarehouseCapacity (BAG-02 主城倉庫)');

    suite.test('容量 = 50 + 擴容次數 × 20', () => {
        assert.equals(50, warehouseCapacity(0));
        assert.equals(70, warehouseCapacity(1));
        assert.equals(190, warehouseCapacity(7));
    });

    suite.test('容量上限 200：擴容 8 次即達上限，之後不再增加', () => {
        assert.equals(WAREHOUSE_MAX_SLOTS, warehouseCapacity(8));
        assert.equals(WAREHOUSE_MAX_SLOTS, warehouseCapacity(20));
    });

    suite.test('達上限後不可再擴容', () => {
        assert.isTrue(canExpandWarehouse(7));
        assert.isFalse(canExpandWarehouse(8));
    });

    suite.test('存入未超過容量：成功並增加已用格數', () => {
        const result = storeIntoWarehouse(48, 0, 2);
        assert.isTrue(result.ok);
        assert.equals(50, result.usedSlots);
    });

    suite.test('滿倉拒絕存入：整批拒絕，已用格數不變', () => {
        const result = storeIntoWarehouse(50, 0, 1);
        assert.isFalse(result.ok);
        assert.equals('full', result.reason!);
        assert.equals(50, result.usedSlots);
    });

    suite.test('批次超過剩餘格數：整批拒絕，不做部分存入', () => {
        const result = storeIntoWarehouse(48, 0, 3);
        assert.isFalse(result.ok);
        assert.equals(48, result.usedSlots);
    });

    suite.test('非法輸入拋出 RangeError', () => {
        assert.throws(() => warehouseCapacity(-1));
        assert.throws(() => storeIntoWarehouse(1.5, 0, 1));
        assert.throws(() => storeIntoWarehouse(0, 0, -1));
    });

    return suite;
}
