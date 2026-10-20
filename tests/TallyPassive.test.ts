import { TroopType, Faction } from '../assets/scripts/core/config/Constants';
import { buildTallyCardCatalog } from '../assets/scripts/core/config/TallyCardCatalog';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { applyTallyPassive } from '../assets/scripts/battle/shared/TallyPassive';
import { TestSuite, assert } from './TestRunner';

function cavalry(attackRange: number): TroopUnit {
  return new TroopUnit('u1', TroopType.Cavalry, Faction.Player, { hp: 100, attack: 40, defense: 20, moveRange: 2, attackRange });
}

export function createTallyPassiveSuite(): TestSuite {
  const suite = new TestSuite('TallyPassive (虎符被動掛點 PROG-2-0774)');

  suite.test('騎射合一：白馬騎兵攻擊射程提高為弓兵射程，移動力不變', () => {
    const unit = cavalry(1);
    applyTallyPassive(unit, 'tiger-tally-bai-ma');
    assert.equals(2, unit.attackRange);
    assert.equals(2, unit.getEffectiveMoveRange());
  });

  suite.test('射程下限只升不降：已有更高射程的部隊不被壓低', () => {
    const unit = cavalry(3);
    applyTallyPassive(unit, 'tiger-tally-bai-ma');
    assert.equals(3, unit.attackRange);
  });

  suite.test('沒有被動的模板或沒有模板 id：不改動部隊', () => {
    const unit = cavalry(1);
    applyTallyPassive(unit, 'tiger-tally-cavalry-shock');
    applyTallyPassive(unit, null);
    assert.equals(1, unit.attackRange);
  });

  suite.test('白馬卡目錄：騎兵、SSR、戰鬥開始時觸發', () => {
    const card = buildTallyCardCatalog().get('tiger-tally-bai-ma');
    assert.isDefined(card);
    assert.equals('cavalry', card!.unitType);
    assert.equals('SSR', card!.rarityLabel);
    assert.equals('start-of-battle', card!.timing);
  });

  return suite;
}
