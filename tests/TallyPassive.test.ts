import { TroopType, Faction } from '../assets/scripts/core/config/Constants';
import { buildTallyCardCatalog } from '../assets/scripts/core/config/TallyCardCatalog';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { applyTallyPassive, extraAttackHitsOf } from '../assets/scripts/battle/shared/TallyPassive';
import { BattleCombatResolver } from '../assets/scripts/battle/runtime/BattleCombatResolver';
import { GAME_CONFIG } from '../assets/scripts/core/config/Constants';
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

  suite.test('梟姬卡目錄：弓兵、SR、攻擊時觸發', () => {
    const card = buildTallyCardCatalog().get('tiger-tally-jiao-ji');
    assert.isDefined(card);
    assert.equals('archer', card!.unitType);
    assert.equals('SR', card!.rarityLabel);
    assert.equals('on-attack', card!.timing);
  });

  suite.test('白馬卡目錄：騎兵、SSR、戰鬥開始時觸發', () => {
    const card = buildTallyCardCatalog().get('tiger-tally-bai-ma');
    assert.isDefined(card);
    assert.equals('cavalry', card!.unitType);
    assert.equals('SSR', card!.rarityLabel);
    assert.equals('start-of-battle', card!.timing);
  });

  suite.test('結姻連射：梟姬與男性武將相鄰時攻擊次數 +1，否則 0', () => {
    const unit = new TroopUnit('archer', TroopType.Archer, Faction.Player, { hp: 80, attack: 30, defense: 15 });
    unit.tallyTemplateId = 'tiger-tally-jiao-ji';
    assert.equals(1, extraAttackHitsOf(unit, true));
    assert.equals(0, extraAttackHitsOf(unit, false));
  });

  suite.test('結姻連射：沒有此被動的部隊不因相鄰而多打', () => {
    const unit = cavalry(1);
    unit.tallyTemplateId = 'tiger-tally-cavalry-shock';
    assert.equals(0, extraAttackHitsOf(unit, true));
  });

  suite.test('結姻連射相鄰判定：只有主將男性且站在主將前一排才算', () => {
    const resolver = (general: { gender?: string } | null) => new BattleCombatResolver({
      state: { getGeneral: () => general },
    } as any);
    const archer = (depth: number) => {
      const unit = new TroopUnit('archer', TroopType.Archer, Faction.Player, { hp: 80, attack: 30, defense: 15 });
      unit.moveTo(0, depth);
      return unit;
    };
    const male = resolver({ gender: '男' }) as any;
    assert.isTrue(male.isAdjacentToMaleGeneral(archer(GAME_CONFIG.GRID_DEPTH - 1)));
    assert.isFalse(male.isAdjacentToMaleGeneral(archer(GAME_CONFIG.GRID_DEPTH - 2)));
    const female = resolver({ gender: '女' }) as any;
    assert.isFalse(female.isAdjacentToMaleGeneral(archer(GAME_CONFIG.GRID_DEPTH - 1)));
  });

  return suite;
}
