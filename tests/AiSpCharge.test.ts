/**
 * AiSpCharge — AI 擊殺充能難度倍率（PROG-2-0920，規格 AI武將強度系統 F-3）
 */
import { Faction, SP_PER_KILL, TroopType } from '../assets/scripts/core/config/Constants';
import { AI_DIFFICULTY_SP_MOD, aiSpGainPerKill, resolveAiDifficulty } from '../assets/scripts/core/systems/AiSpCharge';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 60, int: 60, lea: 60,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

function troop(id: string, faction: Faction, lane: number, depth: number): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, faction, {
        hp: 100, attack: 30, defense: 10, moveRange: 1, attackRange: 1,
    });
    unit.moveTo(lane, depth);
    return unit;
}

export function createAiSpChargeSuite(): TestSuite {
    const suite = new TestSuite('AiSpCharge (AI 擊殺充能難度 PROG-2-0920)');

    suite.test('規格 F-3 倍率表：EASY 0.8、NORMAL 1.0、HARD 1.2、NIGHTMARE 1.3、HELL 1.5', () => {
        assert.equals(0.8, AI_DIFFICULTY_SP_MOD.easy);
        assert.equals(1.0, AI_DIFFICULTY_SP_MOD.normal);
        assert.equals(1.2, AI_DIFFICULTY_SP_MOD.hard);
        assert.equals(1.3, AI_DIFFICULTY_SP_MOD.nightmare);
        assert.equals(1.5, AI_DIFFICULTY_SP_MOD.hell);
    });

    suite.test('AI 每次擊殺 SP：NORMAL 等於 SP_PER_KILL；其他難度為 floor(SP_PER_KILL × 倍率)', () => {
        assert.equals(SP_PER_KILL, aiSpGainPerKill('normal'));
        assert.equals(16, aiSpGainPerKill('easy'));
        assert.equals(24, aiSpGainPerKill('hard'));
        assert.equals(26, aiSpGainPerKill('nightmare'));
        assert.equals(30, aiSpGainPerKill('hell'));
        assert.equals(SP_PER_KILL, aiSpGainPerKill());
    });

    suite.test('戰鬥中：敵方擊殺按 aiDifficulty 充能，玩家擊殺仍是固定 SP_PER_KILL', () => {
        services().initialize();
        const ctrl = new BattleController();
        ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
        ctrl.state.aiDifficulty = 'hell';
        const enemyKiller = troop('enemy-killer', Faction.Enemy, 1, 3);
        const playerKiller = troop('player-killer', Faction.Player, 3, 3);
        const victimOfPlayer = troop('victim-a', Faction.Enemy, 2, 2);
        const victimOfEnemy = troop('victim-b', Faction.Player, 2, 4);
        for (const unit of [enemyKiller, playerKiller, victimOfPlayer, victimOfEnemy]) ctrl.state.addUnit(unit);

        const enemySpBefore = ctrl.state.enemyGeneral!.currentSp;
        ctrl['combatResolver'].onUnitKilled(victimOfPlayer, playerKiller, services());
        const playerSpAfter = ctrl.state.playerGeneral!.currentSp;
        ctrl['combatResolver'].onUnitKilled(victimOfEnemy, enemyKiller, services());

        assert.equals(SP_PER_KILL, playerSpAfter, '玩家擊殺仍是 20');
        assert.equals(enemySpBefore + 30, ctrl.state.enemyGeneral!.currentSp, '敵方在 HELL 擊殺應充能 30');
    });

    suite.test('難度解析：入口參數優先，其次遭遇資料，都沒有或不合法則 NORMAL', () => {
        assert.equals('hell', resolveAiDifficulty('hell', 'easy'));
        assert.equals('hard', resolveAiDifficulty(undefined, 'hard'));
        assert.equals('normal', resolveAiDifficulty(undefined, undefined));
        assert.equals('normal', resolveAiDifficulty('Hell', null));
        assert.equals('nightmare', resolveAiDifficulty('typo', 'nightmare'));
    });

    suite.test('戰鬥入口：initBattle 傳入的難度寫進 state，未傳則 NORMAL', () => {
        services().initialize();
        const withHell = new BattleController();
        withHell.initBattle(general('p', Faction.Player), general('e', Faction.Enemy), undefined, undefined, undefined, 'hell');
        assert.equals('hell', withHell.state.aiDifficulty);

        const defaulted = new BattleController();
        defaulted.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
        assert.equals('normal', defaulted.state.aiDifficulty);
    });

    return suite;
}
