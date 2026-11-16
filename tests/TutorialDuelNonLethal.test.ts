/**
 * 教學戰單挑：敵將一定接受、打到生命下限就分勝負、不會直接結束戰鬥（PROG-2-9335）
 *
 * 以前敵將多半拒絕，玩家只看到一行字，敵軍還整場減半；接受的話又是打到一方倒下，第 4 回合就結束。
 * Unity 對照：新手關把 AI 的決策固定成「接受」，並把決鬥改成打到殘血就停的表演賽。
 */
import { assert, TestSuite } from './TestRunner';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { Faction, GAME_CONFIG } from '../assets/scripts/core/config/Constants';
import { GeneralUnit, type GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string, faction: Faction, hp: number, str: number): GeneralUnit {
    return new GeneralUnit({ id, name: id, faction, hp, maxSp: 100, initialSp: 0, str, int: 60, lea: 60, luk: 0, tacticSlots: [] } as unknown as GeneralConfig);
}

function battle(tutorial: boolean, playerStr: number, enemyStr: number, enemyHp = 900): BattleController {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.initBattle(general('p', Faction.Player, 1500, playerStr), general('e', Faction.Enemy, enemyHp, enemyStr));
    ctrl.tutorialBattle = tutorial;
    return ctrl;
}

export function createTutorialDuelNonLethalSuite(): TestSuite {
    const suite = new TestSuite('TutorialDuelNonLethal (教學戰單挑必接受且不打死 PROG-2-9335)');
    const ratio = GAME_CONFIG.tutorialDuelHpFloorRatio;

    suite.test('設定值：敵將必接受、生命下限三成', () => {
        assert.isTrue(GAME_CONFIG.tutorialEnemyAlwaysAcceptsDuel);
        assert.equals(0.3, ratio);
    });

    suite.test('教學戰：敵主將只剩一絲血、兵力全無也照樣接受', () => {
        const ctrl = battle(true, 90, 30);
        ctrl.state.enemyGeneral!.currentHp = 1;
        assert.isTrue(ctrl.evaluateDuelAcceptance(Faction.Player).accepted);
    });

    suite.test('教學戰我方較強：敵主將停在生命下限、沒倒下，戰鬥繼續，勝方是我方', () => {
        const ctrl = battle(true, 95, 20);
        const result = ctrl.resolveDuelChallenge(Faction.Player, true);
        const enemy = ctrl.state.enemyGeneral!;
        assert.equals('ongoing', result);
        assert.equals(Math.ceil(enemy.maxHp * ratio), enemy.currentHp);
        assert.isFalse(enemy.isDead());
        assert.equals(Faction.Player, ctrl.getLastDuelWinner());
    });

    suite.test('教學戰我方較弱：我方主將停在生命下限、不判負，勝方是敵方', () => {
        const ctrl = battle(true, 5, 99, 90000);
        const result = ctrl.resolveDuelChallenge(Faction.Player, true);
        const player = ctrl.state.playerGeneral!;
        assert.equals('ongoing', result);
        assert.equals(Math.ceil(player.maxHp * ratio), player.currentHp);
        assert.equals(Faction.Enemy, ctrl.getLastDuelWinner());
    });

    suite.test('教學戰：主將生命本來就低於下限時不會再被扣血', () => {
        const ctrl = battle(true, 5, 99, 90000);
        ctrl.state.playerGeneral!.currentHp = 100;
        ctrl.resolveDuelChallenge(Faction.Player, true);
        assert.equals(100, ctrl.state.playerGeneral!.currentHp);
    });

    suite.test('一般戰鬥不變：單挑打到一方倒下並分出勝負', () => {
        const ctrl = battle(false, 95, 20);
        const result = ctrl.resolveDuelChallenge(Faction.Player, true);
        assert.equals('player-win', result);
        assert.isTrue(ctrl.state.enemyGeneral!.isDead());
    });

    return suite;
}
