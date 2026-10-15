import { Faction, StatusEffect } from '../assets/scripts/core/config/Constants';
import { RootSkillResolver } from '../assets/scripts/battle/skills/resolvers/RootSkillResolver';
import { BattleSkillTargetMode, BattleSkillTiming, SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';
import { createBattleSkillTestContext, createTestGeneral, createTestUnit } from './BattleSkillTestUtils';

export function createRootSkillResolverSuite(): TestSuite {
  const suite = new TestSuite('RootSkillResolver (定身 root PROG-2-0764)');
  const request = {
    sourceType: SkillSourceType.TigerTally,
    ownerUid: Faction.Player,
    battleSkillId: 'tally-changban-root',
    targetMode: BattleSkillTargetMode.Self,
    timing: BattleSkillTiming.ActiveCast,
  };

  const run = (caster: { lane: number; depth: number } | null, enemies: Array<[string, number, number]>) => {
    const units = enemies.map(([id, lane, depth]) => createTestUnit(id, Faction.Enemy, lane, depth, { hp: 1000 }));
    const bundle = createBattleSkillTestContext({
      playerGeneral: createTestGeneral('changban', Faction.Player, { str: 100, lea: 80 }),
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units,
    });
    const context = { ...bundle.context, getCasterCell: () => caster };
    const result = new RootSkillResolver().execute(request as never, context as never);
    return { result, buffs: bundle.buffLog };
  };

  suite.test('3x3 內的敵軍定身 1 回合，3x3 外不受影響', () => {
    const { result, buffs } = run({ lane: 2, depth: 4 }, [['in-a', 1, 3], ['in-b', 3, 5], ['out', 2, 6]]);
    assert.isTrue(result.applied);
    assert.equals(2, buffs.length);
    assert.isTrue(buffs.every((b) => b.effect === StatusEffect.Rooted && b.turns === 1));
    assert.isFalse(buffs.some((b) => b.unitId === 'out'));
  });

  suite.test('3x3 內沒有敵軍：不施放', () => {
    const { result, buffs } = run({ lane: 2, depth: 4 }, [['far', 0, 0]]);
    assert.isFalse(result.applied);
    assert.equals(0, buffs.length);
  });

  suite.test('沒有施放者位置：不施放', () => {
    const { result } = run(null, [['in', 1, 3]]);
    assert.isFalse(result.applied);
  });

  return suite;
}
