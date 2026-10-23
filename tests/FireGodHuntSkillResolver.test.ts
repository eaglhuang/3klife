import { Faction } from '../assets/scripts/core/config/Constants';
import { FireGodHuntSkillResolver } from '../assets/scripts/battle/skills/resolvers/FireGodHuntSkillResolver';
import { FIRE_HAZARD_DAMAGE_PER_TURN } from '../assets/scripts/battle/skills/SkillEffectFormulas';
import { BattleSkillTargetMode, BattleSkillTiming, SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';
import { createBattleSkillTestContext, createTestGeneral, createTestUnit } from './BattleSkillTestUtils';

export function createFireGodHuntSkillResolverSuite(): TestSuite {
  const suite = new TestSuite('FireGodHuntSkillResolver (火神狩獵 push-fire PROG-2-0771)');
  const request = {
    sourceType: SkillSourceType.TigerTally,
    ownerUid: Faction.Player,
    battleSkillId: 'tally-fire-god-hunt',
    targetMode: BattleSkillTargetMode.EnemySingle,
    timing: BattleSkillTiming.ActiveCast,
  };

  suite.test('單體敵軍遠離施放者 1 格，並把原格設為火場', () => {
    const target = createTestUnit('target', Faction.Enemy, 2, 5, { hp: 1000 });
    const bundle = createBattleSkillTestContext({
      playerGeneral: createTestGeneral('huo', Faction.Player),
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [target],
    });
    const moves: Array<{ lane: number; depth: number }> = [];
    const fires: Array<{ cell: { lane: number; depth: number }; damage: number }> = [];
    const context = {
      ...bundle.context,
      getCasterCell: () => ({ lane: 2, depth: 4 }),
      isCellFreeForPush: () => true,
      pushUnitTo: (_unit: unknown, lane: number, depth: number) => { moves.push({ lane, depth }); },
      setTileHazard: (cell: { lane: number; depth: number }, damage: number) => { fires.push({ cell, damage }); },
    };
    const result = new FireGodHuntSkillResolver().execute(request as never, context as never);
    assert.isTrue(result.applied);
    assert.equals(1, moves.length);
    assert.equals(6, moves[0].depth);
    assert.equals(1, fires.length);
    assert.equals(2, fires[0].cell.lane);
    assert.equals(5, fires[0].cell.depth);
    assert.equals(FIRE_HAZARD_DAMAGE_PER_TURN, fires[0].damage);
  });

  suite.test('擊退受阻：目標仍在原格，原格照樣點火，並依未走完步數扣 5%', () => {
    const target = createTestUnit('target', Faction.Enemy, 2, 5, { hp: 1000 });
    const bundle = createBattleSkillTestContext({
      playerGeneral: createTestGeneral('huo', Faction.Player),
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [target],
    });
    const fires: Array<{ lane: number; depth: number }> = [];
    const context = {
      ...bundle.context,
      getCasterCell: () => ({ lane: 2, depth: 4 }),
      isCellFreeForPush: () => false,
      pushUnitTo: () => { throw new Error('should not move'); },
      setTileHazard: (cell: { lane: number; depth: number }) => { fires.push(cell); },
    };
    const result = new FireGodHuntSkillResolver().execute(request as never, context as never);
    assert.isTrue(result.applied);
    assert.equals(1, fires.length);
    assert.equals(5, fires[0].depth);
    assert.equals(1, bundle.damageLog.length);
    assert.equals(Math.round(target.maxHp * 0.05), bundle.damageLog[0].damage);
  });

  suite.test('沒有施放者位置：不施放、不點火', () => {
    const target = createTestUnit('target', Faction.Enemy, 2, 5, { hp: 1000 });
    const bundle = createBattleSkillTestContext({
      playerGeneral: createTestGeneral('huo', Faction.Player),
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [target],
    });
    let fired = false;
    const context = {
      ...bundle.context,
      getCasterCell: () => null,
      isCellFreeForPush: () => true,
      pushUnitTo: () => {},
      setTileHazard: () => { fired = true; },
    };
    const result = new FireGodHuntSkillResolver().execute(request as never, context as never);
    assert.isFalse(result.applied);
    assert.isFalse(fired);
  });

  return suite;
}
