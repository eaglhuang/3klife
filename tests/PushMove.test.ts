import { pushAway } from '../assets/scripts/battle/shared/PushMove';
import { TestSuite, assert } from './TestRunner';

export function createPushMoveSuite(): TestSuite {
  const suite = new TestSuite('PushMove (位移純邏輯 PROG-2-0767)');
  const free = () => true;

  suite.test('沿深度軸遠離施放者，推 1 格', () => {
    const plan = pushAway({ lane: 2, depth: 5 }, { lane: 2, depth: 4 }, 1, free);
    assert.equals(6, plan.depth);
    assert.equals(1, plan.movedSteps);
    assert.isFalse(plan.blocked);
  });

  suite.test('同一深度時沿 lane 軸遠離施放者', () => {
    const plan = pushAway({ lane: 3, depth: 4 }, { lane: 2, depth: 4 }, 1, free);
    assert.equals(4, plan.lane);
    assert.equals(4, plan.depth);
  });

  suite.test('下一格被佔用：停在原地並標記受阻', () => {
    const plan = pushAway({ lane: 2, depth: 5 }, { lane: 2, depth: 4 }, 2, (_l, d) => d !== 6);
    assert.equals(0, plan.movedSteps);
    assert.isTrue(plan.blocked);
    assert.equals(5, plan.depth);
  });

  return suite;
}
