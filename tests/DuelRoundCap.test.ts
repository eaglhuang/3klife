/**
 * DuelRoundCap — 單挑回合上限（PROG-2-0923）
 *
 * 規格沒有定義單挑的結束回合數，這裡採暫定值 DUEL_MAX_ROUNDS：達上限仍雙方存活 → 平局。
 * 骰子固定為 0（每次閃躲都成功）時，修改前單挑會無限迴圈；修改後應在上限內結束。
 *
 * Unity 對照：像 Update 裡的 while 迴圈加上 maxIterations 保險絲，避免卡死在一個永遠不滿足的條件上。
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { DUEL_MAX_ROUNDS } from '../assets/scripts/battle/runtime/BattleGeneralDuelFlow';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 80, int: 80, lea: 80,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

function duelBattle(randomValue: number): BattleController {
    services().initialize();
    services().session.setRandomSource(() => randomValue);
    const ctrl = new BattleController();
    ctrl.initBattle(general('challenger', Faction.Player), general('defender', Faction.Enemy));
    const defenderTroop = new TroopUnit('e-0', TroopType.Infantry, Faction.Enemy, {
        hp: 100, attack: 30, defense: 10, moveRange: 1, attackRange: 1,
    });
    defenderTroop.moveTo(2, 6);
    ctrl.state.addUnit(defenderTroop);
    return ctrl;
}

export function createDuelRoundCapSuite(): TestSuite {
    const suite = new TestSuite('DuelRoundCap (單挑回合上限 PROG-2-0923)');

    suite.test('上限為正整數，且非零', () => {
        assert.isTrue(Number.isInteger(DUEL_MAX_ROUNDS) && DUEL_MAX_ROUNDS > 0, `DUEL_MAX_ROUNDS=${DUEL_MAX_ROUNDS}`);
    });

    suite.test('每回合都閃躲（骰子 0）：單挑在上限內結束，雙方都活著、血量不變（平局）', () => {
        const ctrl = duelBattle(0);
        const challenger = ctrl.state.playerGeneral!;
        const defender = ctrl.state.enemyGeneral!;
        const challengerHpBefore = challenger.currentHp;
        const defenderHpBefore = defender.currentHp;

        ctrl.resolveDuelChallenge(Faction.Player, true);

        assert.isFalse(challenger.isDead(), '挑戰方應存活');
        assert.isFalse(defender.isDead(), '防守方應存活');
        assert.equals(challengerHpBefore, challenger.currentHp, '挑戰方血量不變');
        assert.equals(defenderHpBefore, defender.currentHp, '防守方血量不變');
    });
    return suite;
}
