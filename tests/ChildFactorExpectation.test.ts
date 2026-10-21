/**
 * ChildFactorExpectation.test.ts — 父母因子推得子嗣預期分布（WBS ORAC-03 / PROG-2-1069）headless 測試
 *
 * Unity 對照：EditMode Test。解析值用手算驗證；另用固定種子跑大量模擬，
 * 確認解析值與 inheritFactors 實際抽樣一致，避免兩邊規則漂移。
 */
import { assert, TestSuite } from './TestRunner';
import {
    AncestorFactorSource,
    inheritFactors,
} from '../assets/scripts/core/systems/FactorInheritance';
import { expectedChildFactorPool } from '../assets/scripts/core/systems/ChildFactorExpectation';

function source(uid: string, generation: 1 | 2 | 3, factors: Array<[string, string]>): AncestorFactorSource {
    return {
        uid,
        generation,
        factorIds: factors.map(([id]) => id),
        genes: factors.map(([id, type]) => ({ id, type, displayName: id, isLocked: true }) as never),
    };
}

/** 固定種子的線性同餘亂數，回傳 [0,1) */
function seededRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

export function createChildFactorExpectationSuite(): TestSuite {
    const suite = new TestSuite('ChildFactorExpectation (ORAC-03 父母因子→子嗣預期分布)');

    suite.test('G1 父母的因子必定進池（機率 1），色系權重為 1', () => {
        const result = expectedChildFactorPool([source('mom', 1, [['f_blue', 'blue']])]);
        assert.equals(1, result.factors.length);
        assert.equals(1, result.factors[0].chance);
        assert.equals(1, result.colorWeights.blue);
    });

    suite.test('G2 / G3 祖先的機率為 50% / 25%', () => {
        const g2 = expectedChildFactorPool([source('grandpa', 2, [['f_red', 'red']])]);
        assert.equals(0.5, g2.factors[0].chance);
        const g3 = expectedChildFactorPool([source('great', 3, [['f_red', 'red']])]);
        assert.equals(0.25, g3.factors[0].chance);
    });

    suite.test('同一因子來自多位祖先：至少一位進池即成立（1 - Π(1 - p)）', () => {
        // G2 與 G3 各自 50%、25%：1 - 0.5 × 0.75 = 0.625
        const result = expectedChildFactorPool([
            source('grandpa', 2, [['f_red', 'red']]),
            source('great', 3, [['f_red', 'red']]),
        ]);
        assert.equals(0.625, result.factors[0].chance);
        assert.equals(2, result.factors[0].sourceUids.length);
    });

    suite.test('父母平均 LUK 乘法修正後封頂 1：LUK 100 時 G2 機率 = 1', () => {
        const result = expectedChildFactorPool([source('grandpa', 2, [['f_red', 'red']])], { parentAvgLuk: 100 });
        assert.equals(1, result.factors[0].chance);
    });

    suite.test('停用色系的因子不進分布', () => {
        const result = expectedChildFactorPool(
            [source('mom', 1, [['f_blue', 'blue'], ['f_red', 'red']])],
            { enabledColors: ['blue'] },
        );
        assert.equals(1, result.factors.length);
        assert.equals(0, result.colorWeights.red);
    });

    suite.test('色系權重依機率加總後正規化，總和為 1', () => {
        // blue 機率 1、red 機率 0.5 → blue 2/3、red 1/3
        const result = expectedChildFactorPool([
            source('mom', 1, [['f_blue', 'blue']]),
            source('grandpa', 2, [['f_red', 'red']]),
        ]);
        assert.isTrue(Math.abs(result.colorWeights.blue - 2 / 3) < 1e-9);
        assert.isTrue(Math.abs(result.colorWeights.red - 1 / 3) < 1e-9);
        const sum = Object.values(result.colorWeights).reduce((acc, value) => acc + value, 0);
        assert.isTrue(Math.abs(sum - 1) < 1e-9);
    });

    suite.test('沒有可繼承因子：分布全為 0，不除以零', () => {
        const result = expectedChildFactorPool([]);
        assert.equals(0, result.factors.length);
        assert.equals(0, Object.values(result.colorWeights).reduce((acc, value) => acc + value, 0));
    });

    suite.test('排序：機率高者在前；同機率依 factorId 排序', () => {
        const result = expectedChildFactorPool([
            source('grandpa', 2, [['f_b', 'blue'], ['f_a', 'blue']]),
            source('mom', 1, [['f_c', 'blue']]),
        ]);
        assert.equals('f_c', result.factors[0].factorId);
        assert.equals('f_a', result.factors[1].factorId);
        assert.equals('f_b', result.factors[2].factorId);
    });

    suite.test('與 inheritFactors 實際抽樣一致：固定種子 20000 次，機率誤差 < 0.02', () => {
        const sources: AncestorFactorSource[] = [
            source('mom', 1, [['f_blue', 'blue']]),
            source('grandpa', 2, [['f_red', 'red'], ['f_blue', 'blue']]),
            source('great', 3, [['f_red', 'red'], ['f_green', 'green']]),
        ];
        const expected = expectedChildFactorPool(sources);
        const trials = 20000;
        const hitCount = new Map<string, number>();
        const random = seededRandom(20260421);
        for (let i = 0; i < trials; i += 1) {
            // maxFactors 放大，避免截斷干擾比對（期望值本來就不計截斷）
            for (const factor of inheritFactors(sources, { random, maxFactors: 99 })) {
                hitCount.set(factor.id, (hitCount.get(factor.id) ?? 0) + 1);
            }
        }
        for (const item of expected.factors) {
            const observed = (hitCount.get(item.factorId) ?? 0) / trials;
            assert.isTrue(
                Math.abs(observed - item.chance) < 0.02,
                `${item.factorId}: expected ${item.chance}, observed ${observed}`,
            );
        }
    });

    return suite;
}
