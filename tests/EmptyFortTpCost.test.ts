import { getTacticTpCost } from '../assets/scripts/core/systems/SortieDeploy';
import { canLearnTactic, tacticLearnThreshold } from '../assets/scripts/core/systems/TacticLearning';
import { rollInspireRound, inspireBlockReasons, type InspireEvent } from '../assets/scripts/core/systems/MentorInspiration';
import { TestSuite, assert } from './TestRunner';

// 諸葛亮 SR 的空城計靈感事件（教官系統 §F-6）：第 5~18 回合、基礎率 25%、最低 ★1
const EMPTY_FORT_EVENT: InspireEvent = {
  eventId: 'EVT_ZHUGE_EMPTY_FORT',
  tacticId: 'TAC_EMPTY_FORT',
  triggerWindow: [5, 18],
  baseRate: 0.25,
  minStar: 1,
};
const ctx = { mentorStar: 1, friendshipBonus: 0, childLuk: 0, childBloodlines: [] };

export function createEmptyFortTpCostSuite(): TestSuite {
  const suite = new TestSuite('EmptyFortTpCost (空城計 TP 消耗與靈感事件 PROG-2-0778)');

  suite.test('空城計施放消耗 55 TP（戰法系統規格）', () => {
    assert.equals(55, getTacticTpCost('TAC_EMPTY_FORT'));
  });

  suite.test('空城計學習門檻 = 55 × 2 = 110', () => {
    assert.equals(110, tacticLearnThreshold(getTacticTpCost('TAC_EMPTY_FORT')));
    assert.isFalse(canLearnTactic(109, getTacticTpCost('TAC_EMPTY_FORT')));
    assert.isTrue(canLearnTactic(110, getTacticTpCost('TAC_EMPTY_FORT')));
  });

  suite.test('空城計靈感閘門：第 5~18 回合、星等 ≥1 才擲骰', () => {
    assert.equals(0, inspireBlockReasons(EMPTY_FORT_EVENT, 5, ctx).length);
    assert.equals(0, inspireBlockReasons(EMPTY_FORT_EVENT, 18, ctx).length);
    assert.isTrue(inspireBlockReasons(EMPTY_FORT_EVENT, 19, ctx).includes('out-of-window'));
    assert.isTrue(inspireBlockReasons(EMPTY_FORT_EVENT, 10, { ...ctx, mentorStar: 0 }).includes('star-too-low'));
  });

  suite.test('空城計靈感：同一場只觸發一次', () => {
    const always = () => 0;
    const first = rollInspireRound([EMPTY_FORT_EVENT], 10, ctx, new Set(), always);
    assert.equals(1, first.length);
    assert.equals(0, rollInspireRound([EMPTY_FORT_EVENT], 11, ctx, new Set(first), always).length);
  });

  return suite;
}
