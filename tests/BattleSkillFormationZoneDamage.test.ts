import { Faction } from '../assets/scripts/core/config/Constants';
import { BattleSkillDamageResolver } from '../assets/scripts/battle/skills/BattleSkillDamageResolver';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { TestSuite, assert } from './TestRunner';
import { createBattleSkillTestContext, createTestGeneral, createTestUnit } from './BattleSkillTestUtils';

export function createBattleSkillFormationZoneDamageSuite(): TestSuite {
  const suite = new TestSuite('BattleSkillFormationZoneDamage (技能傷害套用防禦區 PROG-2-0761)');
  const resolver = new BattleSkillDamageResolver();
  const profile = resolveBattleSkillProfile('guan-yu-slash')!;

  const damageWith = (zoneMultiplier: number | null) => {
    const caster = createTestGeneral('guan-yu', Faction.Player, { str: 100, lea: 90 });
    const target = createTestUnit('enemy', Faction.Enemy, 2, 3, { defense: 40 });
    const bundle = createBattleSkillTestContext({
      playerGeneral: caster,
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [target],
    });
    const context = {
      ...bundle.context,
      getDefenseZoneMultiplier: zoneMultiplier === null ? undefined : () => zoneMultiplier,
    };
    return resolver.resolveDamage(profile, caster, target, context as never, 0);
  };

  suite.test('目標站在防禦區：技能傷害較低', () => {
    assert.isTrue(damageWith(1.4) < damageWith(null)!);
  });

  suite.test('倍率 1 或沒有區域 hook：傷害相同', () => {
    assert.equals(damageWith(null), damageWith(1));
  });

  return suite;
}
