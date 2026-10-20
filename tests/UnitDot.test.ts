import { advanceUnitDot, dotTickAmount, type UnitDot } from '../assets/scripts/battle/shared/UnitDot';
import { TestSuite, assert } from './TestRunner';

export function createUnitDotSuite(): TestSuite {
  const suite = new TestSuite('UnitDot (毒箭持續傷害 PROG-2-0766)');

  suite.test('每回合扣最大 HP 的 10%，至少 1', () => {
    assert.equals(50, dotTickAmount(500, 0.1));
    assert.equals(1, dotTickAmount(5, 0.1));
  });

  suite.test('中毒 2 回合：推進兩次後移除', () => {
    const dot: UnitDot = { unitId: 'enemy', ratio: 0.1, remainingTurns: 2 };
    assert.isTrue(advanceUnitDot(dot));
    assert.isFalse(advanceUnitDot(dot));
  });

  return suite;
}
