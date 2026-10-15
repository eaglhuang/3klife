import { Faction } from '../assets/scripts/core/config/Constants';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { MORALE_DURATION_TURNS, advanceMoraleOf, advanceMorale, castMorale } from '../assets/scripts/battle/shared/Morale';
import { TestSuite, assert } from './TestRunner';
import { createTestUnit } from './BattleSkillTestUtils';

function makeUnit(id: string, faction: Faction): TroopUnit {
  return createTestUnit(id, faction, 1, 1, { hp: 100 });
}

export function createMoraleDurationSuite(): TestSuite {
  const suite = new TestSuite('Morale duration (鼓舞持續 3 回合 PROG-2-0770)');

  suite.test('暫定持續回合為 3', () => {
    assert.equals(3, MORALE_DURATION_TURNS);
  });

  suite.test('施放後士氣 +bonus 並開始計時 3 回合', () => {
    const unit = makeUnit('ally', Faction.Player);
    castMorale(unit, 20);
    assert.equals(20, unit.morale);
    assert.equals(3, unit.moraleTurns);
  });

  suite.test('持續期間再施放不疊加士氣，只刷新回合數', () => {
    const unit = makeUnit('ally', Faction.Player);
    castMorale(unit, 20);
    advanceMorale(unit);
    castMorale(unit, 20);
    assert.equals(20, unit.morale);
    assert.equals(3, unit.moraleTurns);
  });

  suite.test('回合頭遞減，三次後歸零且士氣清為 0', () => {
    const unit = makeUnit('ally', Faction.Player);
    castMorale(unit, 20);
    assert.isTrue(advanceMorale(unit));
    assert.equals(2, unit.moraleTurns);
    assert.isTrue(advanceMorale(unit));
    assert.equals(1, unit.moraleTurns);
    assert.isFalse(advanceMorale(unit));
    assert.equals(0, unit.moraleTurns);
    assert.equals(0, unit.morale);
  });

  suite.test('過期後再施放重新生效（不殘留舊值）', () => {
    const unit = makeUnit('ally', Faction.Player);
    castMorale(unit, 20);
    advanceMorale(unit);
    advanceMorale(unit);
    advanceMorale(unit);
    castMorale(unit, 20);
    assert.equals(20, unit.morale);
    assert.equals(3, unit.moraleTurns);
  });

  suite.test('未施放的單位 advance 不改變任何數值', () => {
    const unit = makeUnit('ally', Faction.Player);
    assert.isFalse(advanceMorale(unit));
    assert.equals(0, unit.morale);
    assert.equals(0, unit.moraleTurns);
  });

  suite.test('行動陣營回合頭只遞減該陣營的士氣計時', () => {
    const ally = makeUnit('ally', Faction.Player);
    const enemy = makeUnit('enemy', Faction.Enemy);
    castMorale(ally, 20);
    castMorale(enemy, 20);
    advanceMoraleOf([ally, enemy], Faction.Player);
    assert.equals(2, ally.moraleTurns);
    assert.equals(3, enemy.moraleTurns);
    assert.equals(20, enemy.morale);
  });

  return suite;
}
