/**
 * ChildUltimateAwakenSpec — 家傳奧義覺醒公式與繼承紀錄（doc_spec_0340；PROG-2-2025）
 */
import { assert, TestSuite } from './TestRunner';
import { childUltimateAwakenProbability, evaluateUltimateAwakening, type ChildAwakenContext } from '../assets/scripts/core/systems/ChildUltimateAwaken';

function ctx(over: Partial<ChildAwakenContext>): ChildAwakenContext {
    return { childUid: 'c1', parentUid: 'p1', parentUltimateId: 'ult_a', greenGeneLevel: 1, parentAffinity: 0, randomRoll: 0, ...over };
}

export function createChildUltimateAwakenSpecSuite(): TestSuite {
    const suite = new TestSuite('ChildUltimateAwakenSpec (家傳奧義覺醒 doc_spec_0340 PROG-2-2025)');

    suite.test('§2.1 保底、等級、親密度門檻與上限', () => {
        const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
        assert.isTrue(near(0.05, childUltimateAwakenProbability(0, 0)));
        assert.isTrue(near(0.20, childUltimateAwakenProbability(3, 79)));
        assert.isTrue(near(0.30, childUltimateAwakenProbability(3, 80)));
        assert.isTrue(near(0.40, childUltimateAwakenProbability(5, 100)));
        assert.isTrue(near(0.80, childUltimateAwakenProbability(20, 100)));
        assert.isTrue(near(0.05, childUltimateAwakenProbability(Number.NaN, Number.NaN)));
    });

    suite.test('§4.3 機率被上限截斷：擲 0.79 成功、0.80 失敗', () => {
        assert.isTrue(evaluateUltimateAwakening(ctx({ greenGeneLevel: 20, parentAffinity: 90, randomRoll: 0.79 })) !== null);
        assert.equals(null, evaluateUltimateAwakening(ctx({ greenGeneLevel: 20, parentAffinity: 90, randomRoll: 0.80 })));
        assert.equals(null, evaluateUltimateAwakening(ctx({ greenGeneLevel: 3, parentAffinity: 79, randomRoll: 0.25 })));
    });

    suite.test('§3 繼承紀錄完整性與世代遞增', () => {
        const r = evaluateUltimateAwakening(ctx({ randomRoll: 0 }))!;
        assert.equals('ult_a', r.ultimateId);
        assert.isTrue(r.isInherited);
        assert.equals('p1', r.sourceParentUid);
        assert.equals(1, r.inheritedGen);
        assert.equals(0.2, r.vitalityCostDiscount);
        assert.equals(3, evaluateUltimateAwakening(ctx({ randomRoll: 0, parentInheritedGen: 2 }))!.inheritedGen);
    });

    return suite;
}
