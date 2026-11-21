// @spec-source → PROG-2-9712（線上一年試玩：開場那場自動代打不會自己結束回合，要補按 45 次）
import { TestSuite, assert } from './TestRunner';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { Faction } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
// Cocos view 模組使用 CLI register-cc-test-stub；不將整個 Editor UI 型別樹引入 headless tsconfig。
const { TurnFlowManager } = require('../assets/scripts/battle/views/TurnFlowManager');

/** 假時鐘：scheduleOnce 依延遲排隊，advance 依時間順序執行（同 TurnFlowDuelStuck） */
class FakeClock {
    public now = 0;
    private queue: Array<{ at: number; fn: () => void }> = [];
    public readonly scene = { isValid: true, scheduleOnce: (fn: () => void, delay = 0) => { this.queue.push({ at: this.now + delay, fn }); } };
    public advance(seconds: number): void {
        const end = this.now + seconds;
        for (;;) {
            this.queue.sort((a, b) => a.at - b.at);
            const next = this.queue[0];
            if (!next || next.at > end) break;
            this.queue.shift();
            this.now = next.at;
            next.fn();
        }
        this.now = end;
    }
}

function setup(): { ctrl: BattleController; ctx: any; clock: FakeClock; flow: any; turn: () => number } {
    services().initialize();
    const ctrl = new BattleController();
    const g = (id: string, faction: Faction) => new GeneralUnit({ id, name: id, faction, hp: 100000, str: 80, int: 80, lea: 80 });
    ctrl.initBattle(g('p', Faction.Player), g('e', Faction.Enemy));
    const clock = new FakeClock();
    const ctx: any = { ctrl, isAdvancingTurn: false, isDuelPanelActive: false, isDrainingCombatVisual: false, deployRuntime: { showToast() {} } };
    const bridge = {
        isAutoPlayActive: true,
        refreshBattleViews() {}, hideEnemyThinkingPanel() {}, showEnemyThinkingPanel() {}, playTurnBanner() {},
        resolveDuelPresentation: async () => 'ongoing',
    };
    const flow = new TurnFlowManager(ctx, clock.scene as any, bridge as any);
    return { ctrl, ctx, clock, flow, turn: () => services().battle.getSnapshot().turn };
}

export function createTurnFlowAutoPlaySuite(): TestSuite {
    const suite = new TestSuite('TurnFlowAutoPlay (自動代打不斷線 PROG-2-9712)');

    suite.test('結束回合靜默早退（流程停在選格出陣）時，自動代打會代放主將並繼續推進', () => {
        const { ctrl, clock, flow, turn } = setup();
        assert.equals('ok', ctrl.startGeneralDuel());
        assert.isTrue(ctrl.isWaitingDuelPlacement);
        const before = turn();
        flow.scheduleAutoPlayEndTurn();
        clock.advance(120);
        assert.isFalse(ctrl.isWaitingDuelPlacement, '不再等玩家點格子');
        assert.isDefined(ctrl.playerGeneralUnitId ?? undefined, '主將已代為出陣');
        assert.isTrue(turn() >= before + 2, `回合有自己推進（${before} → ${turn()}）`);
    });

    suite.test('流程不在可下指令狀態、onEndTurn 早退時不會斷線：恢復後自動代打接著推進', () => {
        const { ctrl, ctx, clock, flow, turn } = setup();
        const before = turn();
        ctx.isAdvancingTurn = false;
        const sm = (ctrl as any).flowStateMachine;
        const original = sm.canAdvanceTurn.bind(sm);
        let locked = true;
        sm.canAdvanceTurn = () => !locked && original();
        flow.scheduleAutoPlayEndTurn();
        clock.advance(5);
        assert.equals(before, turn(), '鎖住期間不推進');
        locked = false;
        clock.advance(60);
        assert.isTrue(turn() > before, '解鎖後自動代打仍在排程並推進');
    });

    suite.test('敵將發起單挑：自動代打照評估代為決定，不等玩家點選', async () => {
        const { ctx, clock, flow } = setup();
        let decided: boolean | null = null;
        flow._onPlayerDuelDecision = async (accepted: boolean) => { decided = accepted; ctx.isDuelPanelActive = false; };
        flow._showDuelChallengePanel();
        assert.isTrue(ctx.isDuelPanelActive, '決定前仍擋住回合推進');
        clock.advance(5);
        assert.isTrue(decided !== null, '已代為接受或拒絕');
        assert.isFalse(ctx.isDuelPanelActive);
    });

    return suite;
}
