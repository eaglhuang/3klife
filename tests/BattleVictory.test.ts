// @spec-source → 戰場勝負結算（BattleVictoryResolver，PROG-2-0202）；規格未寫回合上限結果，以目前程式為準並標為暫定
/**
 * BattleVictory — 戰鬥勝負結算的 headless 驗收（PROG-2-0202）
 *
 * 驗收範圍：主將死、要塞歸零、回合上限、雙方同時敗；以及結果事件 BattleEnded 只在結束時發出。
 * 回合上限目前的判定是「玩家輸」，規格沒有寫，這裡只鎖定程式現行行為，記入待辦暫定設計。
 *
 * Unity 對照：像是戰鬥結束的 Result Checker，只讀場上狀態、回傳一個結果列舉，不改場景。
 */
import { TestSuite, assert } from './TestRunner';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { resolveBattleVictory } from '../assets/scripts/battle/runtime/BattleVictoryResolver';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { BattleFlowState } from '../assets/scripts/battle/controllers/BattleFlowStateMachine';
import { EVENT_NAMES, Faction, GAME_CONFIG, Weather } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({ id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 100, str: 80, int: 80, lea: 80 });
}

function freshBattle(): BattleController {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.initBattle(general('p-victory', Faction.Player), general('e-victory', Faction.Enemy), undefined, Weather.Clear);
    return ctrl;
}

export function createBattleVictorySuite(): TestSuite {
    const suite = new TestSuite('BattleVictory');

    suite.test('進行中：雙方主將與要塞都還在，結果為 ongoing 且不發結束事件', () => {
        const ctrl = freshBattle();
        let ended = 0;
        const off = services().event.on(EVENT_NAMES.BattleEnded, () => { ended += 1; });
        assert.equals('ongoing', resolveBattleVictory(ctrl.state));
        off();
        assert.equals(0, ended);
    });

    suite.test('敵方主將死亡：玩家勝，並發出 BattleEnded', () => {
        const ctrl = freshBattle();
        const results: Array<{ result: string }> = [];
        const off = services().event.on(EVENT_NAMES.BattleEnded, (data?: { result: string }) => { if (data) results.push(data); });
        ctrl.state.enemyGeneral!.currentHp = 0;
        assert.equals('player-win', resolveBattleVictory(ctrl.state));
        off();
        assert.equals(1, results.length);
        assert.equals('player-win', results[0].result);
    });

    suite.test('玩家主將死亡：敵方勝', () => {
        const ctrl = freshBattle();
        ctrl.state.playerGeneral!.currentHp = 0;
        assert.equals('enemy-win', resolveBattleVictory(ctrl.state));
    });

    suite.test('敵方要塞歸零（主將仍活）：玩家勝', () => {
        const ctrl = freshBattle();
        ctrl.state.enemyFortressHp = 0;
        assert.equals('player-win', resolveBattleVictory(ctrl.state));
    });

    suite.test('玩家要塞歸零：敵方勝', () => {
        const ctrl = freshBattle();
        ctrl.state.playerFortressHp = 0;
        assert.equals('enemy-win', resolveBattleVictory(ctrl.state));
    });

    suite.test('雙方同時敗（主將與要塞各自歸零）：平手 draw', () => {
        const ctrl = freshBattle();
        ctrl.state.playerGeneral!.currentHp = 0;
        ctrl.state.enemyGeneral!.currentHp = 0;
        assert.equals('draw', resolveBattleVictory(ctrl.state));
    });

    suite.test('回合超過上限：目前程式判玩家輸（暫定，規格未定）', () => {
        const ctrl = freshBattle();
        assert.equals('ongoing', resolveBattleVictory(ctrl.state), '第 1 回合');
        services().battle['turn'] = GAME_CONFIG.TURN_LIMIT;
        assert.equals('ongoing', resolveBattleVictory(ctrl.state), '正好到上限還不算超過');
        services().battle['turn'] = GAME_CONFIG.TURN_LIMIT + 1;
        assert.equals('enemy-win', resolveBattleVictory(ctrl.state));
    });

    suite.test('控制器結束流程：提交勝負後狀態機進 Finished 並鎖住結果；進行中則維持 Planning', () => {
        const ctrl = freshBattle();
        const flow = ctrl['flowStateMachine'];
        ctrl['commitBattleResult'](ctrl['checkVictory']());
        assert.equals('ongoing', flow.result, '未分勝負時結果為 ongoing');
        assert.equals(BattleFlowState.Planning, flow['_state']);
        ctrl.state.enemyGeneral!.currentHp = 0;
        ctrl['commitBattleResult'](ctrl['checkVictory']());
        assert.equals('player-win', flow.result);
        assert.equals(BattleFlowState.Finished, flow['_state']);
    });

    suite.test('同一局重複判定：BattleEnded 只發一次，結果仍每次回傳；重開新局後可再發', () => {
        const ctrl = freshBattle();
        let ended = 0;
        const off = services().event.on(EVENT_NAMES.BattleEnded, () => { ended += 1; });
        ctrl.state.enemyGeneral!.currentHp = 0;
        assert.equals('player-win', resolveBattleVictory(ctrl.state));
        assert.equals('player-win', resolveBattleVictory(ctrl.state), '第二次仍回傳同一結果');
        assert.equals('player-win', resolveBattleVictory(ctrl.state));
        assert.equals(1, ended, '事件只發一次');
        freshBattle();
        off();
    });

    return suite;
}
