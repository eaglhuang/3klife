import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { applyTallyTeamMoraleAura } from '../assets/scripts/battle/shared/TallyPassive';
import { TestSuite, assert } from './TestRunner';

function unit(id: string, faction: Faction, tally?: string): TroopUnit {
  const u = new TroopUnit(id, TroopType.Archer, faction, { hp: 100, attack: 20, defense: 20, moveRange: 1, attackRange: 2 });
  if (tally) u.tallyTemplateId = tally;
  return u;
}

export function createTallyDaQiaoCharismaSuite(): TestSuite {
  const suite = new TestSuite('TallyDaQiaoCharisma (大喬全隊魅力換算士氣 PROG-2-1582)');

  suite.test('己方有大喬：沒有士氣的友軍士氣 +20，敵軍不受影響', () => {
    const dq = unit('dq', Faction.Player, 'tiger-tally-da-qiao');
    const ally = unit('a', Faction.Player);
    const foe = unit('f', Faction.Enemy);
    assert.equals(2, applyTallyTeamMoraleAura([dq, ally, foe], Faction.Player));
    assert.equals(20, ally.morale);
    assert.equals(0, foe.morale);
  });

  suite.test('已有士氣者不覆蓋；大喬陣亡後無效', () => {
    const dq = unit('dq', Faction.Player, 'tiger-tally-da-qiao');
    const ally = unit('a', Faction.Player);
    ally.morale = 50;
    ally.moraleTurns = 2;
    applyTallyTeamMoraleAura([dq, ally], Faction.Player);
    assert.equals(50, ally.morale);
    assert.equals(2, ally.moraleTurns);
    const dead = unit('dq2', Faction.Player, 'tiger-tally-da-qiao');
    dead.currentHp = 0;
    const other = unit('b', Faction.Player);
    assert.equals(0, applyTallyTeamMoraleAura([dead, other], Faction.Player));
    assert.equals(0, other.morale);
  });

  return suite;
}
