import { Faction } from '../assets/scripts/core/config/Constants';
import { ProjectedDamageSkillResolver } from '../assets/scripts/battle/skills/resolvers/ProjectedDamageSkillResolver';
import { BattleSkillTargetMode, BattleSkillTiming, SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';
import { createBattleSkillTestContext, createTestGeneral, createTestUnit } from './BattleSkillTestUtils';

export function createWeiZhenHuaXiaSkillSuite(): TestSuite {
  const suite = new TestSuite('威震華夏 首回合加倍與擊殺重置 (PROG-2-0773)');
  const request = {
    sourceType: SkillSourceType.TigerTally,
    ownerUid: Faction.Player,
    battleSkillId: 'tally-wei-zhen-hua-xia',
    targetMode: BattleSkillTargetMode.EnemySingle,
    timing: BattleSkillTiming.ActiveCast,
  };

  function runOnce(turn: number, enemyHp: number) {
    const enemy = createTestUnit('enemy', Faction.Enemy, 2, 5, { hp: enemyHp });
    const caster = createTestUnit('caster', Faction.Player, 2, 4, { hp: 1000 });
    const bundle = createBattleSkillTestContext({
      playerGeneral: createTestGeneral('zhaoyun', Faction.Player),
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [caster, enemy],
    });
    const context = {
      ...bundle.context,
      getTurnNumber: () => turn,
      getCasterUnitId: () => 'caster',
    };
    const result = new ProjectedDamageSkillResolver().execute(request as never, context as never);
    return { result, bundle, enemy };
  }

  suite.test('第 1 回合傷害為第 2 回合的 2 倍', () => {
    const first = runOnce(1, 100000);
    const later = runOnce(2, 100000);
    assert.isTrue(first.result.applied);
    assert.isTrue(later.result.applied);
    assert.equals(later.bundle.damageLog[0].damage * 2, first.bundle.damageLog[0].damage);
  });

  suite.test('擊殺目標後，施放者行動重置（再行動 1 次）', () => {
    const killed = runOnce(2, 1);
    assert.isTrue(killed.enemy.isDead());
    assert.equals(1, killed.bundle.resetLog.length);
    assert.equals('caster', killed.bundle.resetLog[0].unitId);
    assert.equals('tally-wei-zhen-hua-xia', killed.bundle.resetLog[0].battleSkillId);
  });

  suite.test('未擊殺目標：不重置施放者', () => {
    const alive = runOnce(2, 100000);
    assert.isFalse(alive.enemy.isDead());
    assert.equals(0, alive.bundle.resetLog.length);
  });

  return suite;
}
