/**
 * 龍膽符七進七出：閃避後反擊（PROG-2-1595，暫定 50%）戰鬥流程測試
 *
 * 用夜襲場景（全局命中 −25%）讓擲骰 0.99 落空：持龍膽符的守方回擊攻方；沒有龍膽符則不回擊。
 */
import { TestSuite, assert } from './TestRunner';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { TroopType } from '../assets/scripts/shared/CommonEnums';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { BattleTactic, Faction, Weather } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { tallyEvadeCounterRatioOf } from '../assets/scripts/battle/shared/TallyPassive';

function general(faction: Faction, id: string): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0,
        str: 100, int: 50, lea: 90, skillId: `${id}-skill`, battlePrimarySkillId: `${id}-skill`,
    });
}

function missedAttack(withLongDan: boolean): { attacker: TroopUnit; defender: TroopUnit } {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.initBattle(general(Faction.Player, 'zhao-yun'), general(Faction.Enemy, 'lu-bu'), undefined, Weather.Clear, BattleTactic.NightRaid);
    const state = (ctrl as unknown as { state: { addUnit(unit: TroopUnit): void } }).state;
    const defender = new TroopUnit('p-cav', TroopType.Cavalry, Faction.Player, { hp: 1000, attack: 40, defense: 10, moveRange: 0, attackRange: 1 });
    defender.moveTo(2, 2);
    if (withLongDan) defender.tallyTemplateId = 'tiger-tally-long-dan';
    const attacker = new TroopUnit('e-inf', TroopType.Infantry, Faction.Enemy, { hp: 1000, attack: 30, defense: 10, moveRange: 0, attackRange: 1 });
    attacker.moveTo(2, 3);
    state.addUnit(defender);
    state.addUnit(attacker);
    const resolver = (ctrl as unknown as {
        combatResolver: { hitRandom: () => number; resolveCombat(a: TroopUnit, d: TroopUnit, s: unknown): void };
    }).combatResolver;
    resolver.hitRandom = () => 0.99;
    resolver.resolveCombat(attacker, defender, services());
    return { attacker, defender };
}

export function createLongDanEvadeCounterSuite(): TestSuite {
    const suite = new TestSuite('LongDanEvadeCounter (龍膽符閃避後反擊 PROG-2-1595)');

    suite.test('龍膽符被動：反擊比例 0.5', () => {
        const unit = { tallyTemplateId: 'tiger-tally-long-dan' } as unknown as TroopUnit;
        assert.equals(0.5, tallyEvadeCounterRatioOf(unit));
    });

    suite.test('攻擊落空：持龍膽符的守方回擊，自己不掉血', () => {
        const { attacker, defender } = missedAttack(true);
        assert.isTrue(attacker.currentHp < 1000, `攻方應被回擊，hp=${attacker.currentHp}`);
        assert.equals(1000, defender.currentHp);
    });

    suite.test('攻擊落空：沒有龍膽符不回擊', () => {
        const { attacker } = missedAttack(false);
        assert.equals(1000, attacker.currentHp);
    });

    return suite;
}
