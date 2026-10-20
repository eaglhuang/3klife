/**
 * LuckBloodlineMutation.test.ts — 運氣 ≥95 血統變異（LUK-06 效果 2，PROG-2-0877）
 *
 * 檢查：隨機挑中的因子升 +1 星；上限 ★4（與因子自身 maxLevel 取小）；
 * 已達上限或沒有因子時不變；每次呼叫恰好消耗一次亂數；不修改輸入。
 *
 * Unity 對照：掉落結算後的額外 Roll，中了就把其中一件升一階，封頂就不再升。
 */
import { assert, TestSuite } from './TestRunner';
import { applyBloodlineMutation } from '../assets/scripts/core/systems/LuckBloodlineMutation';
import type { FactorDictionary, InheritedFactor } from '../assets/scripts/core/systems/FactorInheritance';

function factor(id: string, level: number): InheritedFactor {
    return { id, color: 'blue', level, generation: 1, sourceUids: ['x'] };
}

function fixed(value: number): () => number {
    let calls = 0;
    const fn = () => { calls += 1; return value; };
    (fn as unknown as { calls: () => number }).calls = () => calls;
    return fn;
}

export function createLuckBloodlineMutationSuite(): TestSuite {
    const suite = new TestSuite('LuckBloodlineMutation (運氣 ≥95 血統變異)');

    suite.test('隨機挑中的因子升 +1 星，其他因子不動', () => {
        const input = [factor('a', 2), factor('b', 3)];
        const out = applyBloodlineMutation(input, fixed(0.9));
        assert.equals(2, out[0].level);
        assert.equals(4, out[1].level);
    });

    suite.test('星級已達 ★4 上限：不再升星', () => {
        const out = applyBloodlineMutation([factor('a', 4)], fixed(0));
        assert.equals(4, out[0].level);
    });

    suite.test('因子自身 maxLevel 低於 ★4：以 maxLevel 為上限', () => {
        const dictionary = new Map([['a', { id: 'a', maxLevel: 3 }]]) as unknown as FactorDictionary;
        const out = applyBloodlineMutation([factor('a', 3)], fixed(0), dictionary);
        assert.equals(3, out[0].level);
    });

    suite.test('沒有因子：原樣回傳，且不消耗亂數', () => {
        const random = fixed(0.5);
        const out = applyBloodlineMutation([], random);
        assert.equals(0, out.length);
        assert.equals(0, (random as unknown as { calls: () => number }).calls());
    });

    suite.test('每次呼叫恰好消耗一次亂數，且不修改輸入', () => {
        const input = [factor('a', 1)];
        const random = fixed(0);
        const out = applyBloodlineMutation(input, random);
        assert.equals(1, (random as unknown as { calls: () => number }).calls());
        assert.equals(1, input[0].level);
        assert.equals(2, out[0].level);
    });

    return suite;
}
