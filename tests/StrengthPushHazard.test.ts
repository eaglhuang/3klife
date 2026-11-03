import { extendPushIntoHazard } from '../assets/scripts/battle/shared/PushMove';
import { TestSuite, assert } from './TestRunner';

const free = () => true;

export function createStrengthPushHazardSuite(): TestSuite {
    const suite = new TestSuite('StrengthPushHazard (力量推入危險地形 PROG-2-1608)');
    const origin = { lane: 2, depth: 4 };
    const plan = { lane: 2, depth: 5, movedSteps: 1, blocked: false };

    suite.test('力量 ≥ 90 且下一格是危險地形：多推 1 格', () => {
        const next = extendPushIntoHazard(plan, origin, 95, free, (l, d) => l === 2 && d === 6);
        assert.equals(6, next.depth);
        assert.equals(2, next.movedSteps);
    });

    suite.test('下一格不是危險地形、力量不足、或已受阻：不多推', () => {
        assert.equals(5, extendPushIntoHazard(plan, origin, 95, free, () => false).depth);
        assert.equals(5, extendPushIntoHazard(plan, origin, 89, free, () => true).depth);
        assert.equals(5, extendPushIntoHazard({ ...plan, blocked: true }, origin, 95, free, () => true).depth);
        assert.equals(5, extendPushIntoHazard(plan, origin, 95, () => false, () => true).depth);
    });

    return suite;
}
