// @spec-source → 戰場勝負結算（BattleVictoryResolver，PROG-2-0202）；回合上限依《戰場大回合推進狀態機》判攻方撤退（PROG-2-9311）
/**
 * BattleVictory — 戰鬥勝負結算的 headless 驗收（PROG-2-0202）
 *
 * 驗收範圍：主將死、要塞歸零、回合上限、雙方同時敗；以及結果事件 BattleEnded 只在結束時發出。
 * 回合上限：超過即判玩家撤退落敗；教學戰用較短的上限。
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
// eslint-disable-next-line @typescript-eslint/no-var-requires -- 用 require 避開元件型別對 cc 測試替身的型別檢查（同 Issue2159 測試）
const { ResultPopupComposite } = require('../assets/scripts/ui/components/ResultPopupComposite');

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

    suite.test('回合超過上限：判玩家輸，且主將城寨都還在時結算標為撤退', () => {
        const ctrl = freshBattle();
        assert.equals('ongoing', resolveBattleVictory(ctrl.state), '第 1 回合');
        services().battle['turn'] = GAME_CONFIG.TURN_LIMIT;
        assert.equals('ongoing', resolveBattleVictory(ctrl.state), '正好到上限還不算超過');
        services().battle['turn'] = GAME_CONFIG.TURN_LIMIT + 1;
        const ended: Array<{ result: string; retreated?: boolean }> = [];
        const onEnded = (data: { result: string; retreated?: boolean }) => ended.push(data);
        const off = services().event.on(EVENT_NAMES.BattleEnded, onEnded);
        assert.equals('enemy-win', resolveBattleVictory(ctrl.state));
        off();
        assert.equals(1, ended.length, '只發一次結束事件');
        assert.equals(true, ended[0].retreated === true, '回合用盡算撤退');
    });

    suite.test('BattleEnded 帶結束原因：主將倒下 general、城寨被破 fortress、回合用盡 time-up（PROG-2-9414）', () => {
        const causeOf = (setup: (ctrl: BattleController) => void): string | undefined => {
            const ctrl = freshBattle();
            let cause: string | undefined;
            const off = services().event.on(EVENT_NAMES.BattleEnded, (data: { cause?: string }) => { cause = data.cause; });
            setup(ctrl);
            resolveBattleVictory(ctrl.state);
            off();
            services().battle.beginBattle();
            return cause;
        };
        assert.equals('general', causeOf((c) => { c.state.playerGeneral!.currentHp = 0; }));
        assert.equals('fortress', causeOf((c) => { c.state.playerFortressHp = 0; }));
        assert.equals('general', causeOf((c) => { c.state.enemyGeneral!.currentHp = 0; }));
        assert.equals('fortress', causeOf((c) => { c.state.enemyFortressHp = 0; }));
        assert.equals('time-up', causeOf(() => { services().battle['turn'] = GAME_CONFIG.TURN_LIMIT + 1; }));
    });

    suite.test('結算窗說明依結束原因改寫；沒帶原因維持舊文案（PROG-2-9414）', async () => {
        const shown: Array<{ title: string; description: string }> = [];
        const popup = new ResultPopupComposite() as unknown as {
            show: (r: { title: string; description: string }) => Promise<void>;
            _applyGeneralAvatar: () => Promise<void>;
            showResult: (result: string, details?: string, generalId?: string, retreated?: boolean, cause?: string) => Promise<void>;
        };
        popup.show = async (r) => { shown.push(r); };
        popup._applyGeneralAvatar = async () => undefined;
        await popup.showResult('enemy-win', undefined, undefined, false, 'general');
        await popup.showResult('enemy-win', undefined, undefined, true, 'time-up');
        await popup.showResult('enemy-win', undefined, undefined, true);
        await popup.showResult('player-win', undefined, undefined, false, 'camp');
        await popup.showResult('enemy-win', undefined, undefined, false, 'fortress');
        assert.equals('主將倒下，我軍潰敗，再接再厲！', shown[0].description);
        assert.equals('撤退', shown[1].title, '回合用盡標題仍是撤退');
        assert.equals('時限已到仍未破敵，我軍鳴金撤兵。', shown[1].description);
        assert.equals('主動撤退，本場判定戰敗。', shown[2].description, '玩家主動撤退');
        assert.equals('我軍奪下敵營，敵軍不戰自潰！', shown[3].description);
        assert.equals('敵方突破防線，再接再厲！', shown[4].description);
    });

    suite.test('主將陣亡的落敗不標為撤退', () => {
        const ctrl = freshBattle();
        const ended: Array<{ result: string; retreated?: boolean }> = [];
        const onEnded = (data: { result: string; retreated?: boolean }) => ended.push(data);
        const off = services().event.on(EVENT_NAMES.BattleEnded, onEnded);
        ctrl.state.playerGeneral!.currentHp = 0;
        assert.equals('enemy-win', resolveBattleVictory(ctrl.state));
        off();
        assert.equals(true, ended[0].retreated !== true);
    });

    suite.test('教學戰：開場我方 SP 滿、敵主將血量減半，重複套用不會再減（PROG-2-9321）', () => {
        const ctrl = freshBattle();
        const pg = ctrl.state.playerGeneral!;
        const eg = ctrl.state.enemyGeneral!;
        const fullHp = eg.maxHp;
        assert.equals(true, pg.currentSp < pg.maxSp, '一般戰鬥開場 SP 不滿');
        ctrl.tutorialBattle = true;
        assert.equals(pg.maxSp, pg.currentSp);
        const half = Math.round(fullHp * GAME_CONFIG.tutorialEnemyGeneralHpRatio);
        assert.equals(half, eg.maxHp);
        assert.equals(half, eg.currentHp);
        ctrl['applyTutorialRules']();
        assert.equals(half, eg.maxHp, '同一場只減一次');
        ctrl.tutorialBattle = false;
    });

    suite.test('教學戰回合上限較短，再戰一次後仍維持；一般戰鬥用預設上限', () => {
        const ctrl = freshBattle();
        assert.equals(GAME_CONFIG.TURN_LIMIT, services().battle.getTurnLimit(), '一般戰鬥');
        ctrl.tutorialBattle = true;
        assert.equals(GAME_CONFIG.TUTORIAL_TURN_LIMIT, services().battle.getTurnLimit(), '設為教學戰');
        services().battle['turn'] = GAME_CONFIG.TUTORIAL_TURN_LIMIT;
        assert.equals('ongoing', resolveBattleVictory(ctrl.state), '正好到上限還不算超過');
        services().battle['turn'] = GAME_CONFIG.TUTORIAL_TURN_LIMIT + 1;
        const ended: Array<{ result: string; retreated?: boolean; timeUp?: boolean }> = [];
        const off = services().event.on(EVENT_NAMES.BattleEnded, (data: { result: string; retreated?: boolean; timeUp?: boolean }) => ended.push(data));
        assert.equals('player-win', resolveBattleVictory(ctrl.state), '教學戰回合用盡算我方獲勝');
        off();
        assert.equals(true, ended[0].timeUp === true && ended[0].retreated !== true, '標為回合用盡、不是撤退');
        services().battle.beginBattle();
        assert.equals(GAME_CONFIG.TURN_LIMIT, services().battle.getTurnLimit(), '開戰重設回預設');
        ctrl['applyTutorialRules']();
        assert.equals(GAME_CONFIG.TUTORIAL_TURN_LIMIT, services().battle.getTurnLimit(), '控制器重新套用');
        assert.equals('player-win', services().battle.getTurnLimitOutcome());
        ctrl.tutorialBattle = false;
        services().battle.beginBattle();
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
