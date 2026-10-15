import { Faction } from '../assets/scripts/core/config/Constants';
import { BattleSkillDamageResolver } from '../assets/scripts/battle/skills/BattleSkillDamageResolver';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { TestSuite, assert } from './TestRunner';
import { createBattleSkillTestContext, createTestGeneral, createTestUnit } from './BattleSkillTestUtils';

export function createBattleSkillChargeSettlementSuite(): TestSuite {
  const suite = new TestSuite('BattleSkillChargeSettlement (衝鋒結算 PROG-2-0756)');
  const resolver = new BattleSkillDamageResolver();
  const baseProfile = resolveBattleSkillProfile('cao-cao-tactics');
  const chargeProfile = { ...baseProfile!, chargeMultiplier: 2.0 };

  const setup = (casterCell: { lane: number; depth: number } | null) => {
    const caster = createTestGeneral('charger', Faction.Player, { str: 100, lea: 80 });
    const target = createTestUnit('enemy', Faction.Enemy, 2, 3, { defense: 10 });
    const bundle = createBattleSkillTestContext({
      playerGeneral: caster,
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [target],
    });
    const context = { ...bundle.context, getCasterCell: () => casterCell };
    return { caster, target, context };
  };

  suite.test('同一直線上的衝鋒：傷害 ×chargeMultiplier', () => {
    const { caster, target, context } = setup({ lane: 2, depth: 0 });
    const plain = resolver.resolveDamage(baseProfile!, caster, target, context, 0);
    const charged = resolver.resolveDamage(chargeProfile, caster, target, context, 0);
    assert.equals(Math.floor(plain * 2), charged);
  });

  suite.test('斜線上的目標不算衝鋒：傷害與未衝鋒相同', () => {
    const { caster, target, context } = setup({ lane: 1, depth: 0 });
    const plain = resolver.resolveDamage(baseProfile!, caster, target, context, 0);
    const charged = resolver.resolveDamage(chargeProfile, caster, target, context, 0);
    assert.equals(plain, charged);
  });

  suite.test('沒有 chargeMultiplier 的技能不受衝鋒影響', () => {
    const { caster, target, context } = setup({ lane: 2, depth: 0 });
    const plain = resolver.resolveDamage(baseProfile!, caster, target, context, 0);
    assert.equals(plain, resolver.resolveDamage(baseProfile!, caster, target, context, 0));
  });

  suite.test('context 沒有施放者位置時視為無衝鋒', () => {
    const { caster, target, context } = setup(null);
    const plain = resolver.resolveDamage(baseProfile!, caster, target, context, 0);
    const charged = resolver.resolveDamage(chargeProfile, caster, target, context, 0);
    assert.equals(plain, charged);
  });

  return suite;
}
