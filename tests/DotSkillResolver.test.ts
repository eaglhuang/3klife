import { Faction } from '../assets/scripts/core/config/Constants';
import { DotSkillResolver } from '../assets/scripts/battle/skills/resolvers/DotSkillResolver';
import { BattleSkillTargetMode, BattleSkillTiming, SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';
import { createBattleSkillTestContext, createTestGeneral, createTestUnit } from './BattleSkillTestUtils';

export function createDotSkillResolverSuite(): TestSuite {
  const suite = new TestSuite('DotSkillResolver (毒箭 dot PROG-2-0766)');
  const request = {
    sourceType: SkillSourceType.TigerTally,
    ownerUid: Faction.Player,
    battleSkillId: 'tally-poison-arrow',
    targetMode: BattleSkillTargetMode.EnemySingle,
    timing: BattleSkillTiming.ActiveCast,
  };

  suite.test('單體敵軍中毒：比例 0.1、2 回合', () => {
    const target = createTestUnit('enemy', Faction.Enemy, 2, 3, { hp: 1000 });
    const bundle = createBattleSkillTestContext({
      playerGeneral: createTestGeneral('archer', Faction.Player),
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [target],
    });
    const dots: Array<{ id: string; ratio: number; turns: number }> = [];
    const context = {
      ...bundle.context,
      addUnitDot: (unit: { id: string }, ratio: number, turns: number) => { dots.push({ id: unit.id, ratio, turns }); },
    };
    const result = new DotSkillResolver().execute(request as never, context as never);
    assert.isTrue(result.applied);
    assert.equals(1, dots.length);
    assert.equals('enemy', dots[0].id);
    assert.equals(0.1, dots[0].ratio);
    assert.equals(2, dots[0].turns);
  });

  suite.test('沒有可選目標：不施放', () => {
    const bundle = createBattleSkillTestContext({
      playerGeneral: createTestGeneral('archer', Faction.Player),
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [],
    });
    const context = { ...bundle.context, addUnitDot: () => { throw new Error('should not be called'); } };
    const result = new DotSkillResolver().execute(request as never, context as never);
    assert.isFalse(result.applied);
  });

  return suite;
}
