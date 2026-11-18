// @spec-source → PROG-2-9404（試玩 issue #2319：結束回合後超過 20 秒不前進；#2223 轉蛋卡在底層遮罩）
/**
 * TurnAdvanceNeverStuck.test.ts — 任何等待點永遠不回應（或丟錯）時，回合流程仍會往下走。
 *
 * 涵蓋：共用逾時工具、戰鬥動畫佇列單一任務卡死、單挑演出卡死、奧義 cut-in 旗標卡死、階段執行丟錯、
 * 回合收尾丟錯。時間以 FakeClock（scheduleOnce）與縮短後的真實時間上限驅動。
 */
import { TestSuite, assert } from './TestRunner';
import { awaitWithTimeout } from '../assets/scripts/core/utils/AwaitGuard';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { BattleRuntimeOrchestrator } from '../assets/scripts/battle/orchestrators/BattleRuntimeOrchestrator';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { Faction } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { BattleUIBridge, createBattleSceneContext } from '../assets/scripts/battle/views/BattleUIBridge';
import { BATTLE_TURN_FLOW_TIMING, BATTLE_VISUAL_TIMING } from '../assets/scripts/battle/views/BattlePresentationTiming';
// Cocos view 模組使用 CLI register-cc-test-stub；不將整個 Editor UI 型別樹引入 headless tsconfig。
const { TurnFlowManager } = require('../assets/scripts/battle/views/TurnFlowManager');

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const neverResolves = (): Promise<never> => new Promise<never>(() => undefined);
const silent = { warn: () => undefined };

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

function setupFlow(): { ctrl: BattleController; ctx: any; clock: FakeClock; flow: any; turn: () => number } {
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

/** 暫時改寫（as const 的）逾時設定，測完還原 */
function withTiming<T extends object>(target: T, patch: Partial<Record<keyof T, number>>, body: () => Promise<void>): Promise<void> {
    const saved: Record<string, unknown> = {};
    for (const key of Object.keys(patch)) { saved[key] = (target as any)[key]; (target as any)[key] = (patch as any)[key]; }
    return body().finally(() => { for (const key of Object.keys(saved)) (target as any)[key] = saved[key]; });
}

export function createTurnAdvanceNeverStuckSuite(): TestSuite {
    const suite = new TestSuite('TurnAdvanceNeverStuck');

    suite.test('awaitWithTimeout：永不 resolve 的 Promise 逾時後回傳 fallback 並記 warn', async () => {
        const warnings: string[] = [];
        let failReason = '';
        const value = await awaitWithTimeout(neverResolves(), 30, 'fallback', { label: 'x', warn: (m) => warnings.push(m), onFail: (r) => { failReason = r; } });
        assert.equals('fallback', value);
        assert.equals('timeout', failReason);
        assert.equals(1, warnings.length);
    });

    suite.test('awaitWithTimeout：丟錯或 reject 也回傳 fallback、不丟例外；正常完成回傳原值', async () => {
        assert.equals(7, await awaitWithTimeout(Promise.reject(new Error('404')), 1000, 7, silent));
        assert.equals(9, await awaitWithTimeout(Promise.resolve(9), 1000, 0, silent));
    });

    suite.test('戰鬥動畫佇列：第一個任務永不回應，逾時後略過，排在後面的任務照跑、旗標放掉', async () => {
        await withTiming(BATTLE_VISUAL_TIMING, { combatVisualTaskMaxMs: 40 }, async () => {
            const ctx = createBattleSceneContext();
            const bridge = new BattleUIBridge(ctx, { isValid: true } as any) as any;
            let secondRan = false;
            ctx.isUltCutinActive = true; // 模擬：奧義 cut-in 排在卡死任務後面，旗標從排入時就亮著
            bridge._enqueueCombatVisual('hung', () => neverResolves());
            bridge._enqueueCombatVisual('second', () => { secondRan = true; });
            await sleep(200);
            assert.isTrue(secondRan, '卡死的任務逾時後，下一個任務必須執行');
            assert.isFalse(ctx.isDrainingCombatVisual, '佇列排空後不可停在播放中');
            assert.isFalse(ctx.isUltCutinActive, '佇列排空後奧義旗標必須放掉');
        });
    });

    suite.test('戰鬥動畫佇列：任務丟錯不影響後面的任務', async () => {
        const ctx = createBattleSceneContext();
        const bridge = new BattleUIBridge(ctx, { isValid: true } as any) as any;
        let secondRan = false;
        bridge._enqueueCombatVisual('boom', () => { throw new Error('資源載入失敗'); });
        bridge._enqueueCombatVisual('second', () => { secondRan = true; });
        await sleep(50);
        assert.isTrue(secondRan);
        assert.isFalse(ctx.isDrainingCombatVisual);
    });

    suite.test('單挑演出永不回應：逾時後強制收尾、通知渲染層中止演出，結算仍完成', async () => {
        await withTiming(BATTLE_VISUAL_TIMING, { duelPresentationMaxMs: 40 }, async () => {
            const ctx = createBattleSceneContext();
            const bridge = new BattleUIBridge(ctx, { isValid: true } as any);
            let aborted = 0;
            ctx.unitRenderer = { playDuelPresentation: () => neverResolves(), abortDuelPresentation: () => { aborted++; } } as any;
            ctx.ctrl = {
                state: { getGeneral: () => ({ currentHp: 10, maxHp: 100 }) },
                resolveDuelChallenge: () => 'ongoing',
            } as any;
            const result = await bridge.resolveDuelPresentation(Faction.Player, true);
            assert.equals('ongoing', result);
            assert.equals(1, aborted, '逾時要中止渲染層的單挑演出');
        });
    });

    suite.test('奧義 cut-in 旗標永遠不放：超過上限後強制放掉並解鎖，回合數照樣加一', () => {
        const { ctrl, ctx, clock, flow, turn } = setupFlow();
        const before = turn();
        flow.onEndTurn();
        ctx.isUltCutinActive = true; // 演出的 Promise 永不回來，旗標一直亮著
        clock.advance(BATTLE_TURN_FLOW_TIMING.presentationMaxWaitSec - 5);
        assert.isTrue(ctx.isAdvancingTurn, '上限之前演出還在算時間，不可提前解鎖');
        clock.advance(30);
        assert.isFalse(ctx.isAdvancingTurn, '超過上限必須解鎖');
        assert.isFalse(ctx.isUltCutinActive, '演出旗標必須被放掉');
        assert.isTrue(ctrl.canAdvanceBattleTurn(), '戰鬥流程要回到可下指令');
        assert.equals(before + 1, turn(), '敵方回合要補結算，回合數加一');
        flow.onEndTurn();
        clock.advance(60);
        assert.equals(before + 2, turn(), '之後還能繼續結束回合');
    });

    suite.test('單挑旗標永遠不放：同樣強制放掉；但等玩家決定接不接單挑的時間不算卡死', () => {
        const { ctx, clock, flow } = setupFlow();
        flow.onEndTurn();
        flow._duelDecisionPending = true;
        ctx.isDuelPanelActive = true;
        clock.advance(BATTLE_TURN_FLOW_TIMING.presentationMaxWaitSec + 30);
        assert.isTrue(ctx.isAdvancingTurn, '玩家還沒決定單挑，不可強制解鎖');
        flow._duelDecisionPending = false; // 玩家按了接受，之後演出卡死
        clock.advance(BATTLE_TURN_FLOW_TIMING.presentationMaxWaitSec + 5);
        assert.isFalse(ctx.isAdvancingTurn);
        assert.isFalse(ctx.isDuelPanelActive);
    });

    suite.test('回合階段執行丟錯：略過該階段，狀態機不卡在結算中', () => {
        const orchestrator = new BattleRuntimeOrchestrator({ resolveTurnPlan: (plan: readonly any[]) => plan } as any);
        const ran: string[] = [];
        let finalized = 0;
        const result = orchestrator.executeTurnCycle({ finalizeTurnCycle: () => { finalized++; } } as any, [
            { phaseName: 'a', execute: () => { ran.push('a'); throw new Error('UI 事件處理器出錯'); } },
            { phaseName: 'b', execute: () => { ran.push('b'); return {}; } },
        ] as any);
        assert.equals('ongoing', result);
        assert.equals('a,b', ran.join(','), '出錯階段之後的階段仍要執行');
        assert.equals(1, finalized, '回合收尾仍要執行');
    });

    suite.test('敵方回合結算丟錯：回合流程仍走完、可再按結束回合', () => {
        const { ctrl, ctx, clock, flow, turn } = setupFlow();
        const before = turn();
        const original = ctrl.resolveEnemyTurn.bind(ctrl);
        let thrown = 0;
        (ctrl as any).resolveEnemyTurn = () => { thrown++; original(); throw new Error('敵方回合例外'); };
        flow.onEndTurn();
        clock.advance(40);
        assert.equals(1, thrown);
        assert.isFalse(ctx.isAdvancingTurn);
        assert.isTrue(ctrl.canAdvanceBattleTurn());
        assert.equals(before + 1, turn());
    });

    suite.test('回合收尾丟錯：狀態機回到可下指令、回合數仍前進', () => {
        const { ctrl, ctx, clock, flow, turn } = setupFlow();
        const before = turn();
        (ctrl as any).applyWeatherForTurn = () => { throw new Error('天氣資料載入失敗'); };
        flow.onEndTurn();
        clock.advance(40);
        assert.isFalse(ctx.isAdvancingTurn);
        assert.isTrue(ctrl.canAdvanceBattleTurn(), '收尾丟錯不可讓狀態機停在結算中');
        assert.equals(before + 1, turn());
    });

    return suite;
}
