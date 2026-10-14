/**
 * FactorInheritanceLuk.test.ts — LUK 繼承率修正（PROG-2-0510，headless）
 *
 * Unity 對照：EditMode Test 用注入的亂數序列驅動遺傳函式，不跑真實隨機。
 */
import { TestSuite, assert } from './TestRunner';
import {
    inheritFactors,
    inheritanceLukRate,
    AncestorFactorSource,
} from '../assets/scripts/core/systems/FactorInheritance';

function sequence(values: number[]): () => number {
    const queue = [...values];
    return () => (queue.length > 0 ? queue.shift()! : 0.99);
}

/** 二代來源（池機率 0.5）含一個藍因子 */
function secondGenSource(): AncestorFactorSource {
    return {
        uid: 'anc-1',
        generation: 2,
        factorIds: ['f_blue'],
        genes: [{ id: 'f_blue', type: 'blue', displayName: '藍', isLocked: false } as never],
    };
}

export function createFactorInheritanceLukSuite(): TestSuite {
    const suite = new TestSuite('FactorInheritanceLuk (LUK 繼承率修正 PROG-2-0510)');

    suite.test('乘法公式 Base × (1 + avg/100)：avg=60 → ×1.6，封頂 1', () => {
        assert.isTrue(Math.abs(inheritanceLukRate(0.5, 60) - 0.8) < 1e-9);
        assert.isTrue(inheritanceLukRate(0.5, 200) === 1, '超過 1 封頂');
    });

    suite.test('LUK 缺省、負數、非有限值都視為 0，等於基礎率', () => {
        assert.isTrue(inheritanceLukRate(0.5, 0) === 0.5);
        assert.isTrue(inheritanceLukRate(0.5, -20) === 0.5);
        assert.isTrue(inheritanceLukRate(0.5, NaN) === 0.5);
    });

    suite.test('缺省 parentAvgLuk 時 inheritFactors 與舊版相同：亂數 0.6 不過二代池 0.5', () => {
        const result = inheritFactors([secondGenSource()], {
            random: sequence([0.6]),
            enabledColors: ['blue'],
        });
        assert.equals(0, result.length);
    });

    suite.test('父母平均 LUK 60 時二代池機率 0.5 → 0.8，亂數 0.6 通過並抽到因子', () => {
        const result = inheritFactors([secondGenSource()], {
            random: sequence([0.6, 0.9]),
            enabledColors: ['blue'],
            parentAvgLuk: 60,
        });
        assert.equals(1, result.length);
        assert.equals('f_blue', result[0].id);
    });

    return suite;
}
