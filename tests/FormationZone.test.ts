import { Faction } from '../assets/scripts/core/config/Constants';
import {
  advanceFormationZonesOf,
  FORMATION_ZONE_MULTIPLIER,
  FORMATION_ZONE_TURNS,
  zoneDefenseMultiplier,
  type FormationZone,
} from '../assets/scripts/battle/shared/FormationZone';
import { TestSuite, assert } from './TestRunner';

const zone = (lane: number, depth: number, zoneFaction: Faction, casterUnitId = 'zhuge'): FormationZone => ({
  id: `formation-${lane}-${depth}`,
  lane,
  depth,
  zoneFaction,
  casterUnitId,
  defenseMultiplier: FORMATION_ZONE_MULTIPLIER,
  remainingTurns: FORMATION_ZONE_TURNS,
});

export function createFormationZoneSuite(): TestSuite {
  const suite = new TestSuite('FormationZone (持續防禦區 PROG-2-0760／0761)');

  suite.test('所屬陣營站在防禦區：防禦倍率 ×1.4；敵方不受加成；無區域為 1', () => {
    assert.equals(1.4, zoneDefenseMultiplier(zone(1, 1, Faction.Player), Faction.Player));
    assert.equals(1, zoneDefenseMultiplier(zone(1, 1, Faction.Player), Faction.Enemy));
    assert.equals(1, zoneDefenseMultiplier(null, Faction.Player));
  });

  suite.test('區域持續 3 回合：所屬陣營每推進一次倒數一次，歸零即移除', () => {
    const zones = new Map([['1,1', zone(1, 1, Faction.Player)]]);
    const alive = () => true;
    assert.equals(0, advanceFormationZonesOf(zones, Faction.Player, alive).length);
    assert.equals(0, advanceFormationZonesOf(zones, Faction.Player, alive).length);
    assert.equals(1, advanceFormationZonesOf(zones, Faction.Player, alive).length);
    assert.equals(0, zones.size);
  });

  suite.test('敵方的推進不會倒數我方區域', () => {
    const zones = new Map([['1,1', zone(1, 1, Faction.Player)]]);
    advanceFormationZonesOf(zones, Faction.Enemy, () => true);
    assert.equals(FORMATION_ZONE_TURNS, zones.get('1,1')!.remainingTurns);
  });

  suite.test('施放者陣亡：區域立即移除', () => {
    const zones = new Map([['1,1', zone(1, 1, Faction.Player)]]);
    const removed = advanceFormationZonesOf(zones, Faction.Player, () => false);
    assert.equals(1, removed.length);
    assert.equals(0, zones.size);
  });

  return suite;
}
