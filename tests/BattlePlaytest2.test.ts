// @spec-source → Issue #2074；PROG-2-2215
import { TestSuite, assert } from './TestRunner';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { EVENT_NAMES, Faction, GAME_CONFIG, TroopType } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { FirstBattleOperationGuide } from '../assets/scripts/core/systems/FirstBattleOperationGuide';
// Cocos view 模組使用 CLI register-cc-test-stub；不將整個 Editor UI 型別樹引入 headless tsconfig。
const { TurnFlowManager } = require('../assets/scripts/battle/views/TurnFlowManager');
// Cocos view 模組使用 CLI register-cc-test-stub；不將整個 Editor UI 型別樹引入 headless tsconfig。
const { BattleHUDComposite } = require('../assets/scripts/ui/components/BattleHUDComposite');
// Cocos view 模組使用 CLI register-cc-test-stub；不將整個 Editor UI 型別樹引入 headless tsconfig。
const { ActionCommandComposite } = require('../assets/scripts/ui/components/ActionCommandComposite');

function fresh(): BattleController {
    services().initialize();
    const ctrl = new BattleController();
    const g = (id: string, faction: Faction) => new GeneralUnit({ id, name: id, faction, hp: 1000, str: 80, int: 80, lea: 80 });
    ctrl.initBattle(g('p', Faction.Player), g('e', Faction.Enemy));
    return ctrl;
}
export function createBattlePlaytest2Suite(): TestSuite {
    const suite = new TestSuite('BattlePlaytest2');
    suite.test('完整雙方回合只加一；重複敵方結算不再加回合', () => {
        const c = fresh();
        for (let turn = 1; turn <= 3; turn++) {
            assert.equals(turn, services().battle.getSnapshot().turn);
            c.resolvePlayerTurn(); c.resolveEnemyTurn(); c.resolveEnemyTurn();
            c.finalizeEnemyTurn(); c.finalizeEnemyTurn();
            assert.equals(turn + 1, services().battle.getSnapshot().turn);
        }
    });
    suite.test('一般部署後不自動結束回合；委任開啟才排程自動推進，手動結束回合會取消它', () => {
        const callbacks: Array<() => void> = [];
        const toasts: string[] = [];
        let resolves = 0;
        let delegate = false;
        const ctx = { ctrl: { isWaitingDuelPlacement: false, canAdvanceBattleTurn: () => true,
            isDelegateEnabled: () => delegate,
            getPlayerDeployProgress: () => ({ used: 1, limit: 3, reached: false }),
            resolvePlayerTurn: () => { resolves++; return 'enemy-win'; } },
            isAdvancingTurn: false, deployRuntime: { showToast: (t: string) => { toasts.push(t); } } };
        const bridge = { refreshBattleViews() {}, hideEnemyThinkingPanel() {}, playTurnBanner() {} };
        const flow = new TurnFlowManager(ctx as any, { scheduleOnce: (fn: () => void) => callbacks.push(fn) } as any, bridge as any);
        flow.onPlayerDeployed();
        assert.equals(0, callbacks.length, '一般模式不排程自動結束回合');
        assert.contains(toasts[0], '已部署 1/3');
        delegate = true;
        flow.onPlayerDeployed();
        const delayedAuto = callbacks.shift()!;
        flow.onEndTurn();
        flow.finalizeAdvance();
        delayedAuto();
        assert.equals(1, resolves);
    });
    suite.test('部署達上限時提示改為請按結束回合', () => {
        const toasts: string[] = [];
        const ctx = { ctrl: { getPlayerDeployProgress: () => ({ used: 3, limit: 3, reached: true }) },
            isAdvancingTurn: false, deployRuntime: { showToast: (t: string) => { toasts.push(t); } } };
        const flow = new TurnFlowManager(ctx as any, { scheduleOnce: () => {} } as any, {} as any);
        flow.onPlayerDeployed();
        assert.contains(toasts[0], '本回合部署已達上限，請按結束回合');
    });
    suite.test('同一回合可部署 3 次，第 4 次被 limit 擋下；結束回合後次數歸零', () => {
        const c = fresh();
        assert.isTrue(c.tryDeployTroop(TroopType.Infantry, 0).ok, '第 1 次');
        assert.isTrue(c.tryDeployTroop(TroopType.Infantry, 1).ok, '第 2 次');
        assert.isTrue(c.tryDeployTroop(TroopType.Infantry, 2).ok, '第 3 次');
        assert.equals('limit', c.tryDeployTroop(TroopType.Infantry, 3).reason, '第 4 次應被上限擋下');
        assert.equals(3, c.getPlayerDeployProgress().used);
        assert.isTrue(c.getPlayerDeployProgress().reached);
        c.resolvePlayerTurn(); c.resolveEnemyTurn(); c.finalizeEnemyTurn();
        assert.equals(0, c.getPlayerDeployProgress().used, '結束回合後次數歸零');
        assert.isTrue(c.tryDeployTroop(TroopType.Infantry, 3).ok, '新回合可再部署');
    });
    suite.test('回合演出中撤退會鎖定結果、只發一次事件，遲到 callback 不可繼續推進', () => {
        const c = fresh(); c.resolvePlayerTurn(); c.resolveEnemyTurn();
        let ended = 0;
        const off = services().event.on(EVENT_NAMES.BattleEnded, () => { ended++; });
        assert.equals('enemy-win', c.retreatBattle());
        assert.equals('enemy-win', c.retreatBattle());
        assert.isFalse(c.canAdvanceBattleTurn());
        assert.equals('enemy-win', c.resolveEnemyTurn());
        assert.equals('enemy-win', c.finalizeEnemyTurn());
        assert.equals(1, services().battle.getSnapshot().turn);
        assert.equals(1, ended); off();
    });
    suite.test('首戰方案 (b)：不強制判負；第 8 回合提示接手，回合用盡算敵軍退兵、我方獲勝', () => {
        const c = fresh(); c.tutorialBattle = true;
        services().battle['turn'] = GAME_CONFIG.TUTORIAL_TURN_LIMIT;
        assert.equals('ongoing', c['checkVictory']());
        services().battle['turn'] = GAME_CONFIG.TUTORIAL_TURN_LIMIT + 1;
        assert.equals('player-win', c['checkVictory']());
        const normal = fresh(); services().battle['turn'] = 13;
        assert.equals('ongoing', normal['checkVictory']());
        const g = new FirstBattleOperationGuide();
        g.advance('deployed');
        g.advance('turn-stalemate');
        assert.equals('stalemate', g.step);
        assert.contains(g.hint?.message ?? '', '退');
    });
    suite.test('教學第二步在完成一回合後進第三步，不等 SP 滿；失敗也能收起', () => {
        const g = new FirstBattleOperationGuide(); g.advance('deployed');
        assert.isTrue(g.advance('turn-ended'));
        assert.equals('ultimate', g.step);
        assert.isTrue(g.advance('ended'));
        assert.equals(null, g.hint);
    });
    suite.test('HUD 的 SP 數值、填充與可用提示同源；不足訊息帶出當前值與需求', () => {
        fresh();
        const label = { string: '' }, charge = { string: '' }, ready = { string: '' };
        let ratio = -1;
        BattleHUDComposite.prototype['_renderSp'].call({ _spLabel: label, _chargeLabel: charge,
            _spReadyLabel: ready, _spFill: { setScale: (r: number) => { ratio = r; } } } as any, 5, 100);
        assert.equals('SP 5/100', label.string); assert.equals(0.05, ratio);
        assert.contains(charge.string, '消耗 SP 100'); assert.equals('奧義蓄力中', ready.string);
        let text = '';
        const off = services().event.on(EVENT_NAMES.ShowToast, (d: { text: string }) => { text = d.text; });
        ActionCommandComposite.prototype['_onUltimateClick'].call({ _currentSp: 5, _maxSp: 100 } as any);
        assert.contains(text, '5/100'); assert.contains(text, '需要 100'); off();
    });
    return suite;
}
