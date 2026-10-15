import { Faction } from '../assets/scripts/core/config/Constants';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { ProjectedDamageSkillResolver } from '../assets/scripts/battle/skills/resolvers/ProjectedDamageSkillResolver';
import { crossCellsForAll } from '../assets/scripts/battle/skills/SkillGridGeometry';
import { SkillSourceType, BattleSkillTargetMode, BattleSkillTiming } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';
import { createBattleSkillTestContext, createTestGeneral, createTestUnit } from './BattleSkillTestUtils';

const LANES = 5;
const DEPTHS = 8;

export function createBattleSkillFireChainSettlementSuite(): TestSuite {
  const suite = new TestSuite('BattleSkillFireChainSettlement (火計連環火場結算 PROG-2-0757)');

  suite.test('火場範圍：單一目標的十字含自身共 5 格，角落裁切為 3 格', () => {
    assert.equals(5, crossCellsForAll([{ lane: 2, depth: 3 }], LANES, DEPTHS).length);
    assert.equals(3, crossCellsForAll([{ lane: 0, depth: 0 }], LANES, DEPTHS).length);
  });

  suite.test('火場範圍：多目標各自展開，重疊格不去重（由呼叫端決定）', () => {
    const cells = crossCellsForAll([{ lane: 2, depth: 3 }, { lane: 2, depth: 4 }], LANES, DEPTHS);
    assert.equals(10, cells.length);
    assert.isTrue(cells.some((c) => c.lane === 2 && c.depth === 3));
  });

  suite.test('一般傷害技能（未設 hazardCross）：結算傷害，但不產生火場', () => {
    const profile = resolveBattleSkillProfile('cao-cao-tactics');
    assert.isDefined(profile);
    assert.isFalse(!!profile!.hazardCross);
    const target = createTestUnit('enemy', Faction.Enemy, 2, 3, { defense: 0, hp: 1000 });
    const bundle = createBattleSkillTestContext({
      playerGeneral: createTestGeneral('zhou-yu', Faction.Player, { str: 100, lea: 80, int: 100 }),
      enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
      units: [target],
    });
    const hazards: unknown[] = [];
    const context = { ...bundle.context, setTileHazard: () => { hazards.push(1); } };
    const result = new ProjectedDamageSkillResolver().execute({
      sourceType: SkillSourceType.Bloodline,
      ownerUid: Faction.Player,
      battleSkillId: 'cao-cao-tactics',
      targetMode: BattleSkillTargetMode.EnemySingle,
      timing: BattleSkillTiming.ActiveCast,
    } as never, context as never);
    assert.isTrue(result.applied);
    assert.equals(0, hazards.length);
  });

  return suite;
}
