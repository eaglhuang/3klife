import { Faction, StatusEffect } from '../assets/scripts/core/config/Constants';
import { SlowSkillResolver } from '../assets/scripts/battle/skills/resolvers/SlowSkillResolver';
import { BattleSkillTargetMode, BattleSkillTiming, SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';
import { createBattleSkillTestContext, createTestGeneral, createTestUnit } from './BattleSkillTestUtils';

export function createSlowSkillResolverSuite(): TestSuite {
  const suite = new TestSuite('SlowSkillResolver (緩速 slow PROG-2-0765)');
  const request = {
    sourceType: SkillSourceType.Bloodline,
    ownerUid: Faction.Player,
    battleSkillId: 'mentor-slow',
    targetMode: BattleSkillTargetMode.EnemySingle,
    timing: BattleSkillTiming.ActiveCast,
  };

  const run = (enemyHp: number) => {
    const target = createTestUnit('enemy', Faction.Enemy, 2, 3, { hp: enemyHp });
    const bundle = createBattleSkillTestContext({
      playerGeneral: createTestGeneral('zhuge', Faction.Player, { str: 40, int: 110, lea: 80 }),
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [target],
    });
    const result = new SlowSkillResolver().execute(request as never, bundle.context as never);
    return { result, buffs: bundle.buffLog };
  };

  suite.test('單體敵軍施加緩速 1 回合', () => {
    const { result, buffs } = run(1000);
    assert.isTrue(result.applied);
    assert.equals(1, buffs.length);
    assert.isTrue(buffs[0].effect === StatusEffect.Slow && buffs[0].turns === 1);
  });

  suite.test('沒有可選目標：不施放', () => {
    const bundle = createBattleSkillTestContext({
      playerGeneral: createTestGeneral('zhuge', Faction.Player),
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [],
    });
    const result = new SlowSkillResolver().execute(request as never, bundle.context as never);
    assert.isFalse(result.applied);
    assert.equals(0, bundle.buffLog.length);
  });

  return suite;
}
