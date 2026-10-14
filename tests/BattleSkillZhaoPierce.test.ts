// @spec-source → 戰法系統.md §G-3 血統戰法 趙家槍法（三段遞增 1.0/1.2/1.4，PROG-2-0558）
/**
 * BattleSkillZhaoPierce — 趙家槍法三段遞增結算 headless 測試（PROG-2-0558）
 */
import { Faction } from '../assets/scripts/core/config/Constants';
import { BattleSkillDamageResolver } from '../assets/scripts/battle/skills/BattleSkillDamageResolver';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { ProjectedDamageSkillResolver } from '../assets/scripts/battle/skills/resolvers/ProjectedDamageSkillResolver';
import { BattleSkillTargetMode, BattleSkillTiming, SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';
import { createBattleSkillTestContext, createTestGeneral, createTestUnit } from './BattleSkillTestUtils';

export function createBattleSkillZhaoPierceSuite(): TestSuite {
  const suite = new TestSuite('BattleSkillZhaoPierce (趙家槍法三段遞增 PROG-2-0558)');
  const damageResolver = new BattleSkillDamageResolver();

  suite.test('profile：直線長 3 格，三段係數 1.0/1.2/1.4', () => {
    const profile = resolveBattleSkillProfile('zhao-yun-pierce');
    assert.isDefined(profile);
    assert.equals(3, profile!.lineLength!);
    assert.equals(3, profile!.hitStageMultipliers!.length);
    assert.equals(1.0, profile!.hitStageMultipliers![0]);
    assert.equals(1.2, profile!.hitStageMultipliers![1]);
    assert.equals(1.4, profile!.hitStageMultipliers![2]);
  });

  suite.test('單段傷害：第二段為第一段 ×1.2，第三段為第一段 ×1.4（同一目標、同一命中索引）', () => {
    const profile = resolveBattleSkillProfile('zhao-yun-pierce');
    assert.isDefined(profile);
    const caster = createTestGeneral('zhao-yun', Faction.Player, { str: 100, lea: 80 });
    const target = createTestUnit('enemy', Faction.Enemy, 2, 3, { defense: 0 });
    const bundle = createBattleSkillTestContext({
      playerGeneral: caster,
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [target],
    });
    const first = damageResolver.resolveDamage(profile!, caster, target, bundle.context, 0, 0);
    const second = damageResolver.resolveDamage(profile!, caster, target, bundle.context, 0, 1);
    const third = damageResolver.resolveDamage(profile!, caster, target, bundle.context, 0, 2);
    assert.equals(Math.floor(first * 1.2), second);
    assert.equals(Math.floor(first * 1.4), third);
    assert.isTrue(third > second && second > first);
  });

  suite.test('投射結算：單一目標在直線上，三段各結算一次且依序遞增', () => {
    const profile = resolveBattleSkillProfile('zhao-yun-pierce');
    assert.isDefined(profile);
    const caster = createTestGeneral('zhao-yun', Faction.Player, { str: 100, lea: 80 });
    const target = createTestUnit('enemy', Faction.Enemy, 2, 3, { defense: 0, hp: 1000 });
    const bundle = createBattleSkillTestContext({
      playerGeneral: caster,
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [target],
    });
    const request = {
      sourceType: SkillSourceType.Bloodline,
      ownerUid: Faction.Player,
      battleSkillId: 'zhao-yun-pierce',
      targetMode: BattleSkillTargetMode.Line,
      timing: BattleSkillTiming.ActiveCast,
    };
    const result = new ProjectedDamageSkillResolver().execute(request as never, bundle.context);
    assert.isTrue(result.applied);
    assert.equals(3, bundle.damageLog.length);
    assert.equals(Math.floor(bundle.damageLog[0].damage * 1.2), bundle.damageLog[1].damage);
    assert.equals(Math.floor(bundle.damageLog[0].damage * 1.4), bundle.damageLog[2].damage);
  });

  return suite;
}
