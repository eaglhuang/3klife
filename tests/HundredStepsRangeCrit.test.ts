/**
 * HundredStepsRangeCrit.test.ts — 百步穿楊射程 +2 與爆擊率 +50%（PROG-2-0781）
 *
 * 射程：目標需在施放者攻擊射程 ＋ rangeBonus 之內；範圍外的敵軍不被選為目標。
 * 爆擊：用戰場亂數源擲骰，擲中才 ×1.5。
 */
import { Faction } from '../assets/scripts/core/config/Constants';
import { BattleSkillTargetSelector } from '../assets/scripts/battle/skills/BattleSkillTargetSelector';
import { BattleSkillDamageResolver } from '../assets/scripts/battle/skills/BattleSkillDamageResolver';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { BattleSkillTargetMode, BattleSkillTiming, SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';
import { createBattleSkillTestContext, createTestGeneral, createTestUnit } from './BattleSkillTestUtils';

const request = {
  sourceType: SkillSourceType.TigerTally,
  ownerUid: Faction.Player,
  battleSkillId: 'tally-hundred-steps',
  targetMode: BattleSkillTargetMode.EnemySingle,
  timing: BattleSkillTiming.ActiveCast,
};

export function createHundredStepsRangeCritSuite(): TestSuite {
  const suite = new TestSuite('HundredStepsRangeCrit (百步穿楊 射程 +2 / 爆擊率 +50% PROG-2-0781)');

  /** 施放者部隊（烈弓，攻擊射程 2）站在 depth 6；敵軍可由測試指定 */
  function setup(enemies: ReturnType<typeof createTestUnit>[]) {
    const casterUnit = createTestUnit('caster-unit', Faction.Player, 2, 6, { attackRange: 2 });
    const bundle = createBattleSkillTestContext({
      playerGeneral: createTestGeneral('caster', Faction.Player),
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [casterUnit, ...enemies],
    });
    const context = {
      ...bundle.context,
      getCasterCell: () => ({ lane: 2, depth: 6 }),
      getCasterUnitId: () => 'caster-unit',
    };
    return { context, casterUnit };
  }

  suite.test('射程 +2：攻擊射程 2 加 2 = 4，格距 3 的敵軍可被選', () => {
    const inRange = createTestUnit('in-range', Faction.Enemy, 2, 3, { hp: 1000 });
    const { context } = setup([inRange]);
    const targets = new BattleSkillTargetSelector().selectTargets(request as never, resolveBattleSkillProfile('tally-hundred-steps')!, context as never);
    assert.equals(1, targets.length);
    assert.equals('in-range', targets[0].id);
  });

  suite.test('射程 +2：格距 5 的敵軍超出 4 格，不被選為目標', () => {
    const outOfRange = createTestUnit('out-of-range', Faction.Enemy, 2, 1, { hp: 1000 });
    const { context } = setup([outOfRange]);
    const targets = new BattleSkillTargetSelector().selectTargets(request as never, resolveBattleSkillProfile('tally-hundred-steps')!, context as never);
    assert.equals(0, targets.length);
  });

  suite.test('爆擊率 +50%：亂數落在爆擊區間內傷害 ×1.5；落在外面不爆擊', () => {
    const profile = resolveBattleSkillProfile('tally-hundred-steps')!;
    const caster = createTestGeneral('test-hundred', Faction.Player, { str: 100, lea: 80 });
    const target = createTestUnit('enemy', Faction.Enemy, 2, 3, { defense: 20 });
    const bundle = createBattleSkillTestContext({
      playerGeneral: caster,
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [target],
    });
    const resolver = new BattleSkillDamageResolver();
    // 基礎爆擊 5% + 50% = 55%
    assert.equals(138, resolver.resolveDamage(profile, caster, target, { ...bundle.context, randomSource: () => 0.54 }, 0));
    assert.equals(92, resolver.resolveDamage(profile, caster, target, { ...bundle.context, randomSource: () => 0.56 }, 0));
  });

  return suite;
}
