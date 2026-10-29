import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { tallyRearguardDefenseMultiplierOf } from '../assets/scripts/battle/shared/TallyPassive';
import { TestSuite, assert } from './TestRunner';

function unit(id: string, faction: Faction, lane: number, depth: number, tally?: string): TroopUnit {
  const u = new TroopUnit(id, TroopType.Shield, faction, { hp: 100, attack: 20, defense: 20, moveRange: 1, attackRange: 1 });
  u.lane = lane;
  u.depth = depth;
  if (tally) u.tallyTemplateId = tally;
  return u;
}

export function createTallyBaiErRearguardSuite(): TestSuite {
  const suite = new TestSuite('TallyBaiErRearguard (白耳斷後防禦 ×2 PROG-2-1580)');
  const BAI_ER = 'tiger-tally-bai-er';

  suite.test('我方：同列前方有友軍、後方無友軍 → ×2', () => {
    const self = unit('a', Faction.Player, 1, 0, BAI_ER);
    const ahead = unit('b', Faction.Player, 1, 2);
    assert.equals(2, tallyRearguardDefenseMultiplierOf(self, [self, ahead]));
  });

  suite.test('後方還有友軍、或前方沒有友軍 → 1', () => {
    const self = unit('a', Faction.Player, 1, 1, BAI_ER);
    const ahead = unit('b', Faction.Player, 1, 2);
    const behind = unit('c', Faction.Player, 1, 0);
    assert.equals(1, tallyRearguardDefenseMultiplierOf(self, [self, ahead, behind]));
    assert.equals(1, tallyRearguardDefenseMultiplierOf(self, [self, behind]));
    assert.equals(1, tallyRearguardDefenseMultiplierOf(self, [self, unit('d', Faction.Player, 2, 3)]));
  });

  suite.test('敵方推進方向相反：depth 較小的友軍才算前方', () => {
    const self = unit('a', Faction.Enemy, 0, 4, BAI_ER);
    const ahead = unit('b', Faction.Enemy, 0, 2);
    assert.equals(2, tallyRearguardDefenseMultiplierOf(self, [self, ahead]));
  });

  suite.test('沒有白耳虎符 → 1', () => {
    const self = unit('a', Faction.Player, 1, 0);
    assert.equals(1, tallyRearguardDefenseMultiplierOf(self, [self, unit('b', Faction.Player, 1, 2)]));
  });

  return suite;
}
