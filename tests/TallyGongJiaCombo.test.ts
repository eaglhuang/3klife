import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { advanceTallyCombo, tallyComboDamageMultiplierOf } from '../assets/scripts/battle/shared/TallyPassive';
import { TestSuite, assert } from './TestRunner';

function unit(id: string, faction: Faction, tally?: string): TroopUnit {
  const u = new TroopUnit(id, TroopType.Archer, faction, { hp: 100, attack: 20, defense: 20, moveRange: 1, attackRange: 2 });
  if (tally) u.tallyTemplateId = tally;
  return u;
}

export function createTallyGongJiaComboSuite(): TestSuite {
  const suite = new TestSuite('TallyGongJiaCombo (工甲符連擊增傷 PROG-2-1581)');

  suite.test('連續攻擊同一目標每層 +20%，最多 3 層', () => {
    const a = unit('a', Faction.Player, 'tiger-tally-gong-jia-fu');
    const t = unit('t', Faction.Enemy);
    const expected = [1, 1.2, 1.4, 1.6, 1.6];
    for (const value of expected) {
      advanceTallyCombo(a, t);
      assert.equals(value, Math.round(tallyComboDamageMultiplierOf(a, t) * 100) / 100);
    }
  });

  suite.test('換目標層數歸零，舊目標不再享有加成', () => {
    const a = unit('a', Faction.Player, 'tiger-tally-gong-jia-fu');
    const t1 = unit('t1', Faction.Enemy);
    const t2 = unit('t2', Faction.Enemy);
    advanceTallyCombo(a, t1);
    advanceTallyCombo(a, t1);
    advanceTallyCombo(a, t2);
    assert.equals(1, tallyComboDamageMultiplierOf(a, t2));
    assert.equals(1, tallyComboDamageMultiplierOf(a, t1));
  });

  suite.test('沒有工甲符不累積', () => {
    const a = unit('a', Faction.Player);
    const t = unit('t', Faction.Enemy);
    advanceTallyCombo(a, t);
    advanceTallyCombo(a, t);
    assert.equals(1, tallyComboDamageMultiplierOf(a, t));
    assert.equals(0, a.comboStreak);
  });

  return suite;
}
