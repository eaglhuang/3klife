// @spec-source → PROG-2-9350（使用者實玩回報：單挑後結束回合鍵按不動）
import { TestSuite, assert } from './TestRunner';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { Faction } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
// Cocos view 模組使用 CLI register-cc-test-stub；不將整個 Editor UI 型別樹引入 headless tsconfig。
const { TurnFlowManager } = require('../assets/scripts/battle/views/TurnFlowManager');

/** 假時鐘：scheduleOnce 依延遲排隊，advance 依時間順序執行 */
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
    const g = (id: string, faction: Faction) => new GeneralUnit({ id, name: id, faction, hp: 1000, str: 80, int: 80, lea: 80 });
    ctrl.initBattle(g('p', Faction.Player), g('e', Faction.Enemy));
    const clock = new FakeClock();
    const ctx: any = { ctrl, isAdvancingTurn: false, isDuelPanelActive: false, isDrainingCombatVisual: false };
    const bridge = { refreshBattleViews() {}, hideEnemyThinkingPanel() {}, showEnemyThinkingPanel() {}, playTurnBanner() {} };
    const flow = new TurnFlowManager(ctx, clock.scene as any, bridge as any);
    return { ctrl, ctx, clock, flow, turn: () => services().battle.getSnapshot().turn };
}

export function createTurnFlowDuelStuckSuite(): TestSuite {
    const suite = new TestSuite('TurnFlowDuelStuck');

    suite.test('沒有單挑：結束回合後回合數加一，可以再按結束回合', () => {
        const { ctrl, ctx, clock, flow, turn } = setup();
        const before = turn();
        flow.onEndTurn();
        clock.advance(30);
        assert.isFalse(ctx.isAdvancingTurn, '畫面應已解鎖');
        assert.isTrue(ctrl.canAdvanceBattleTurn(), '戰鬥流程應回到可下指令');
        assert.equals(before + 1, turn());
    });

    suite.test('我方回合後的單挑演出長達 25 秒：敵方回合照樣結算，之後還能結束回合', () => {
        const { ctrl, ctx, clock, flow, turn } = setup();
        const before = turn();
        flow.onEndTurn();
        // 單挑演出佔住畫面 25 秒（超過 20 秒安全時限）
        ctx.isDuelPanelActive = true;
        clock.advance(25);
        assert.isTrue(ctx.isAdvancingTurn, '單挑演出中不可提前解鎖');
        ctx.isDuelPanelActive = false;
        clock.advance(30);
        assert.isFalse(ctx.isAdvancingTurn, '演出結束後畫面應解鎖');
        assert.isTrue(ctrl.canAdvanceBattleTurn(), '戰鬥流程不可停在結算中');
        assert.equals(before + 1, turn(), '敵方回合必須結算，回合數加一');
        flow.onEndTurn();
        clock.advance(30);
        assert.equals(before + 2, turn(), '下一回合也能正常推進');
    });

    suite.test('安全解鎖真的觸發時（演出卡住超過時限）也會補完敵方回合，不會鎖死', () => {
        const { ctrl, ctx, clock, flow, turn } = setup();
        const before = turn();
        flow.onEndTurn();
        // 戰鬥演出一直沒結束：每次輪詢都還在播
        ctx.isDrainingCombatVisual = true;
        clock.advance(1);
        flow.finalizeAdvance(); // 等同安全解鎖強制收尾
        assert.isFalse(ctx.isAdvancingTurn);
        assert.isTrue(ctrl.canAdvanceBattleTurn(), '強制解鎖後戰鬥流程要回到可下指令');
        assert.equals(before + 1, turn(), '被跳過的敵方回合要補結算');
        ctx.isDrainingCombatVisual = false;
        clock.advance(60);
        assert.equals(before + 1, turn(), '先前排隊的流程不可再多算一回合');
    });

    suite.test('敵方回合後玩家回應單挑：收尾交回回合流程，結束後可再按結束回合', async () => {
        const { ctrl, ctx, clock, flow, turn } = setup();
        const before = turn();
        const bridge = (flow as any).bridge;
        bridge.resolveDuelPresentation = async () => 'ongoing';
        flow.onEndTurn();
        clock.advance(3);
        // 模擬敵方發起單挑、彈窗開著等玩家決定
        ctx.isDuelPanelActive = true;
        clock.advance(40);
        assert.isTrue(ctx.isAdvancingTurn, '等玩家決定時不可解鎖');
        ctx.deployRuntime = { showToast() {} };
        await (flow as any)._onPlayerDuelDecision(true);
        assert.isFalse(ctx.isDuelPanelActive);
        clock.advance(40);
        assert.isFalse(ctx.isAdvancingTurn);
        assert.isTrue(ctrl.canAdvanceBattleTurn(), '單挑結束後戰鬥流程要回到可下指令');
        assert.equals(before + 1, turn());
    });

    return suite;
}
