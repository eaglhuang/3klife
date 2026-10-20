/**
 * 無雙亂舞：周身區域傷害加擊退 1 格 headless 測試（PROG-2-0799，暫定）
 */
import { Faction } from '../assets/scripts/core/config/Constants';
import { PushSkillResolver } from '../assets/scripts/battle/skills/resolvers/PushSkillResolver';
import { BattleSkillTargetMode, BattleSkillTiming, SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';
import { createBattleSkillTestContext, createTestGeneral, createTestUnit } from './BattleSkillTestUtils';

export function createWushuangLuanwuSuite(): TestSuite {
  const suite = new TestSuite('WushuangLuanwu (無雙亂舞 周身傷害加擊退 PROG-2-0799)');
  const request = {
    sourceType: SkillSourceType.TigerTally,
    ownerUid: Faction.Player,
    battleSkillId: 'tally-wushuang',
    targetMode: BattleSkillTargetMode.AroundSelf,
    timing: BattleSkillTiming.ActiveCast,
  };

  suite.test('周身 3x3 內的敵軍受傷並後退 1 格', () => {
    const near = createTestUnit('near', Faction.Enemy, 2, 5, { hp: 1000 });
    const bundle = createBattleSkillTestContext({
      playerGeneral: createTestGeneral('wushuang', Faction.Player),
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [near],
    });
    const moves: Array<{ id: string; depth: number }> = [];
    const context = {
      ...bundle.context,
      getCasterCell: () => ({ lane: 2, depth: 4 }),
      isCellFreeForPush: () => true,
      pushUnitTo: (unit: { id: string }, _lane: number, depth: number) => { moves.push({ id: unit.id, depth }); },
    };
    const result = new PushSkillResolver().execute(request as never, context as never);
    assert.isTrue(result.applied);
    assert.equals(1, bundle.damageLog.length);
    assert.isTrue(bundle.damageLog[0].damage > 0);
    assert.equals(1, moves.length);
    assert.equals(6, moves[0].depth);
  });

  suite.test('3x3 外的敵軍不受傷、不後退', () => {
    const far = createTestUnit('far', Faction.Enemy, 2, 7, { hp: 1000 });
    const bundle = createBattleSkillTestContext({
      playerGeneral: createTestGeneral('wushuang', Faction.Player),
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [far],
    });
    const context = {
      ...bundle.context,
      getCasterCell: () => ({ lane: 2, depth: 4 }),
      isCellFreeForPush: () => true,
      pushUnitTo: () => { throw new Error('should not move'); },
    };
    const result = new PushSkillResolver().execute(request as never, context as never);
    assert.isFalse(result.applied);
    assert.equals(0, bundle.damageLog.length);
  });

  suite.test('傷害致死的敵軍不擊退', () => {
    const doomed = createTestUnit('doomed', Faction.Enemy, 2, 5, { hp: 1 });
    const bundle = createBattleSkillTestContext({
      playerGeneral: createTestGeneral('wushuang', Faction.Player),
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [doomed],
    });
    const context = {
      ...bundle.context,
      getCasterCell: () => ({ lane: 2, depth: 4 }),
      isCellFreeForPush: () => true,
      pushUnitTo: () => { throw new Error('dead target should not be pushed'); },
    };
    const result = new PushSkillResolver().execute(request as never, context as never);
    assert.isTrue(result.applied);
    assert.equals(1, bundle.damageLog.length);
  });

  suite.test('長坂雄咆（coefficient 0）仍只擊退、不結算傷害', () => {
    const near = createTestUnit('near', Faction.Enemy, 2, 5, { hp: 1000 });
    const bundle = createBattleSkillTestContext({
      playerGeneral: createTestGeneral('changban', Faction.Player),
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [near],
    });
    const context = {
      ...bundle.context,
      getCasterCell: () => ({ lane: 2, depth: 4 }),
      isCellFreeForPush: () => true,
      pushUnitTo: () => {},
    };
    const changban = { ...request, battleSkillId: 'tally-changban-push' };
    const result = new PushSkillResolver().execute(changban as never, context as never);
    assert.isTrue(result.applied);
    assert.equals(0, bundle.damageLog.length);
  });

  return suite;
}
