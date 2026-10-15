import { Faction } from '../assets/scripts/core/config/Constants';
import { MoraleSkillResolver } from '../assets/scripts/battle/skills/resolvers/MoraleSkillResolver';
import { BattleSkillTargetMode, BattleSkillTiming, SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';
import { createBattleSkillTestContext, createTestGeneral, createTestUnit } from './BattleSkillTestUtils';

export function createMoraleSkillResolverSuite(): TestSuite {
  const suite = new TestSuite('MoraleSkillResolver (鼓舞 morale PROG-2-0769)');
  const request = {
    sourceType: SkillSourceType.Bloodline,
    ownerUid: Faction.Player,
    battleSkillId: 'mentor-morale',
    targetMode: BattleSkillTargetMode.AllyAll,
    timing: BattleSkillTiming.ActiveCast,
  };

  suite.test('全隊存活友軍士氣 +20，敵軍不受影響', () => {
    const ally = createTestUnit('ally', Faction.Player, 1, 1, { hp: 100 });
    const enemy = createTestUnit('enemy', Faction.Enemy, 2, 3, { hp: 100 });
    const bundle = createBattleSkillTestContext({
      playerGeneral: createTestGeneral('zhuge', Faction.Player),
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [ally, enemy],
    });
    const result = new MoraleSkillResolver().execute(request as never, bundle.context as never);
    assert.isTrue(result.applied);
    assert.equals(20, ally.morale);
    assert.equals(0, enemy.morale);
  });

  suite.test('士氣 +1%：攻擊值按比例提高', () => {
    const unit = createTestUnit('ally', Faction.Player, 1, 1, { hp: 100 });
    const base = unit.getEffectiveAttack();
    unit.morale = 20;
    assert.isTrue(Math.abs(unit.getEffectiveAttack() - base * 1.2) < 1e-9);
  });

  return suite;
}
