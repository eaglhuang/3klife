import { Faction } from '../assets/scripts/core/config/Constants';
import { PushSkillResolver } from '../assets/scripts/battle/skills/resolvers/PushSkillResolver';
import { BattleSkillTargetMode, BattleSkillTiming, SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';
import { createBattleSkillTestContext, createTestGeneral, createTestUnit } from './BattleSkillTestUtils';

export function createPushSkillResolverSuite(): TestSuite {
  const suite = new TestSuite('PushSkillResolver (位移 push PROG-2-0767)');
  const request = {
    sourceType: SkillSourceType.TigerTally,
    ownerUid: Faction.Player,
    battleSkillId: 'tally-changban-push',
    targetMode: BattleSkillTargetMode.Self,
    timing: BattleSkillTiming.ActiveCast,
  };

  suite.test('3x3 內敵軍遠離施放者 1 格；3x3 外不動', () => {
    const near = createTestUnit('near', Faction.Enemy, 2, 5, { hp: 1000 });
    const far = createTestUnit('far', Faction.Enemy, 2, 7, { hp: 1000 });
    const bundle = createBattleSkillTestContext({
      playerGeneral: createTestGeneral('changban', Faction.Player),
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [near, far],
    });
    const moves: Array<{ id: string; lane: number; depth: number }> = [];
    const context = {
      ...bundle.context,
      getCasterCell: () => ({ lane: 2, depth: 4 }),
      isCellFreeForPush: () => true,
      pushUnitTo: (unit: { id: string }, lane: number, depth: number) => { moves.push({ id: unit.id, lane, depth }); },
    };
    const result = new PushSkillResolver().execute(request as never, context as never);
    assert.isTrue(result.applied);
    assert.equals(1, moves.length);
    assert.equals('near', moves[0].id);
    assert.equals(6, moves[0].depth);
  });

  suite.test('下一格受阻：未走完 1 步扣最大 HP 5%', () => {
    const blocked = createTestUnit('blocked', Faction.Enemy, 2, 5, { hp: 1000 });
    const bundle = createBattleSkillTestContext({
      playerGeneral: createTestGeneral('changban', Faction.Player),
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [blocked],
    });
    const context = {
      ...bundle.context,
      getCasterCell: () => ({ lane: 2, depth: 4 }),
      isCellFreeForPush: () => false,
      pushUnitTo: () => { throw new Error('should not move'); },
    };
    const result = new PushSkillResolver().execute(request as never, context as never);
    assert.isTrue(result.applied);
    assert.equals(1, bundle.damageLog.length);
    assert.equals(Math.round(blocked.maxHp * 0.05), bundle.damageLog[0].damage);
  });

  suite.test('沒有施放者位置：不施放', () => {
    const bundle = createBattleSkillTestContext({
      playerGeneral: createTestGeneral('changban', Faction.Player),
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [],
    });
    const context = { ...bundle.context, getCasterCell: () => null, isCellFreeForPush: () => true, pushUnitTo: () => {} };
    const result = new PushSkillResolver().execute(request as never, context as never);
    assert.isFalse(result.applied);
  });

  return suite;
}
