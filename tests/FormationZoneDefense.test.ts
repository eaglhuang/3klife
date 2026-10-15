import { Faction } from '../assets/scripts/core/config/Constants';
import { zoneDefenseMultiplier } from '../assets/scripts/battle/shared/TileStateRules';
import type { TileEffect } from '../assets/scripts/battle/models/BattleState';
import { TestSuite, assert } from './TestRunner';

const zone = (zoneFaction: Faction, defenseMultiplier = 1.4): TileEffect => ({
  id: 'zone-1-1',
  lane: 1,
  depth: 1,
  state: 'formation-zone',
  zoneFaction,
  defenseMultiplier,
});

export function createFormationZoneDefenseSuite(): TestSuite {
  const suite = new TestSuite('FormationZoneDefense (持續防禦區倍率 PROG-2-0760)');

  suite.test('所屬陣營站在防禦區：防禦倍率 ×1.4', () => {
    assert.equals(1.4, zoneDefenseMultiplier(zone(Faction.Player), Faction.Player));
  });

  suite.test('敵方站在防禦區：不受加成', () => {
    assert.equals(1, zoneDefenseMultiplier(zone(Faction.Player), Faction.Enemy));
  });

  suite.test('沒有防禦區或其他格子狀態：倍率為 1', () => {
    assert.equals(1, zoneDefenseMultiplier(null, Faction.Player));
    assert.equals(1, zoneDefenseMultiplier({ id: 'f', lane: 1, depth: 1, state: 'hazard-fire' }, Faction.Player));
  });

  return suite;
}
