import { assert, TestSuite } from './TestRunner';
import { applyGeneCatalyst, markCatalystUsed } from '../assets/scripts/core/systems/GeneCatalyst';

export function createGeneCatalystSuite(): TestSuite {
    const suite = new TestSuite('GeneCatalyst (BLT-10)');
    suite.test('繼承率增加 25 個百分點', () => {
        const result = applyGeneCatalyst({}, 0.5);
        assert.equals(0.75, result.inheritanceChance);
        assert.isTrue(result.applied);
    });
    suite.test('結果夾在 0~1', () => {
        assert.equals(1, applyGeneCatalyst({}, 0.9).inheritanceChance);
        assert.equals(0, applyGeneCatalyst({}, -1).inheritanceChance);
    });
    suite.test('已用過拒絕且原機率不變', () => {
        for (const chance of [0.5, 1.2, -0.5]) {
            const result = applyGeneCatalyst({ catalystUsed: true }, chance);
            assert.isFalse(result.applied);
            assert.equals(chance, result.inheritanceChance);
            assert.equals('ALREADY_USED', result.reason);
        }
    });
    suite.test('標記不改輸入、保留其他欄位、重複標記冪等', () => {
        const source = Object.freeze({ id: 'retired', catalystUsed: false, genes: ['gene'] });
        const result = markCatalystUsed(source);
        assert.isFalse(source.catalystUsed);
        assert.isTrue(result.catalystUsed);
        assert.equals(source.id, result.id);
        assert.isTrue(source.genes === result.genes);
        assert.isFalse(Object.is(source, result));
        assert.equals(JSON.stringify(result), JSON.stringify(markCatalystUsed(result)));
        assert.equals('ALREADY_USED', applyGeneCatalyst(result, 0.5).reason);
    });
    suite.test('缺少使用欄位與額外欄位不拋錯', () => {
        const source = { label: 'unknown', catalystUsed: undefined };
        assert.equals('unknown', markCatalystUsed(source).label);
        assert.isTrue(applyGeneCatalyst(source, 0).applied);
    });
    suite.test('非有限機率拒絕', () => {
        for (const chance of [NaN, Infinity, -Infinity]) {
            let rejected = false;
            try { applyGeneCatalyst({}, chance); } catch (error) { rejected = error instanceof RangeError; }
            assert.isTrue(rejected);
        }
    });
    return suite;
}
