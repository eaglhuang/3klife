import { Faction } from '../assets/scripts/core/config/Constants';
import { FormationZoneSkillResolver } from '../assets/scripts/battle/skills/resolvers/FormationZoneSkillResolver';
import { BattleSkillTargetMode, BattleSkillTiming, SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import type { FormationZone } from '../assets/scripts/battle/shared/FormationZone';
import { TestSuite, assert } from './TestRunner';
import { createBattleSkillTestContext, createTestGeneral } from './BattleSkillTestUtils';

export function createFormationCastSettlementSuite(): TestSuite {
  const suite = new TestSuite('FormationCastSettlement (八陣圖施放 PROG-2-0761)');
  const request = {
    sourceType: SkillSourceType.Bloodline,
    ownerUid: Faction.Player,
    battleSkillId: 'eight-formation',
    targetMode: BattleSkillTargetMode.Self,
    timing: BattleSkillTiming.ActiveCast,
  };

  const cast = (center: { lane: number; depth: number } | null) => {
    const bundle = createBattleSkillTestContext({
      playerGeneral: createTestGeneral('zhuge', Faction.Player, { str: 40, int: 110, lea: 80 }),
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [],
    });
    const zones: FormationZone[] = [];
    const context = {
      ...bundle.context,
      getCasterCell: () => center,
      getCasterUnitId: () => 'zhuge',
      addFormationZone: (zone: FormationZone) => { zones.push(zone); },
    };
    const result = new FormationZoneSkillResolver().execute(request as never, context as never);
    return { result, zones };
  };

  suite.test('施放者腳下 3x3 成為防禦區：中心 9 格，所屬陣營與 3 回合', () => {
    const { result, zones } = cast({ lane: 2, depth: 4 });
    assert.isTrue(result.applied);
    assert.equals(9, zones.length);
    assert.isTrue(zones.every((z) => z.zoneFaction === Faction.Player && z.remainingTurns === 3 && z.casterUnitId === 'zhuge'));
  });

  suite.test('角落施放：只產生棋盤內的 4 格', () => {
    const { zones } = cast({ lane: 0, depth: 0 });
    assert.equals(4, zones.length);
  });

  suite.test('沒有施放者位置：不施放，不產生區域', () => {
    const { result, zones } = cast(null);
    assert.isFalse(result.applied);
    assert.equals(0, zones.length);
  });

  return suite;
}
