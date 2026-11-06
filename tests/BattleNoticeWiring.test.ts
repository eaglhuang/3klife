/**
 * BattleNoticeWiring.test.ts — 只發事件沒人接收的戰場提示接上畫面（PROG-2-1866）
 *
 * 適性台詞（戰場適性系統 §G，含天氣變化台詞）要寫進戰報並浮 Toast；
 * 其他元件發的 ShowToast（大招充能未滿）要進同一套 Toast 佇列。
 *
 * Unity 對照：EditMode 測試對 EventBus 發事件，檢查 View 介面被呼叫。
 */
import { BattleUIBridge, createBattleSceneContext, fortressDamagedLogLine } from '../assets/scripts/battle/views/BattleUIBridge';
import { Faction } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { EVENT_NAMES } from '../assets/scripts/core/config/Constants';
import { APTITUDE_TOAST_DURATION_S, APTITUDE_TOAST_KEY } from '../assets/scripts/core/systems/AptitudeDialogue';
import { TestSuite, assert } from './TestRunner';

const noop = () => undefined;

function wiredBridge() {
    services().initialize();
    const logs: string[] = [];
    const toasts: Array<{ text: string; duration?: number; key?: string }> = [];
    const ctx = createBattleSceneContext();
    ctx.battleLogPanel = { append: (line: string) => logs.push(line) } as any;
    ctx.deployRuntime = { showToast: (text: string, duration?: number, options?: { key?: string }) => toasts.push({ text, duration, key: options?.key }) } as any;
    const bridge = new BattleUIBridge(ctx, {} as any);
    bridge.subscribeEvents({ onEndTurn: noop, onPlayerDeployed: noop, onTactics: noop, onGeneralDuelRequest: noop, onReplay: noop });
    return { bridge, logs, toasts };
}

export function createBattleNoticeWiringSuite(): TestSuite {
    const suite = new TestSuite('BattleNoticeWiring (適性台詞與 Toast 接線 PROG-2-1866)');

    suite.test('適性台詞：寫進戰報並浮 Toast', () => {
        const { bridge, logs, toasts } = wiredBridge();
        const line = '風向突變——大風來襲！火攻將更具威力！';
        services().event.emit(EVENT_NAMES.AptitudeDialogue, { turn: 3, line });
        bridge.unsubscribeEvents();
        assert.isTrue(logs.includes(line));
        const shown = toasts.filter((t) => t.text === line);
        assert.equals(1, shown.length);
        assert.equals(APTITUDE_TOAST_DURATION_S, shown[0].duration);
        assert.equals(APTITUDE_TOAST_KEY, shown[0].key);
    });

    suite.test('ShowToast：交給 deployRuntime 的 Toast，不寫戰報', () => {
        const { bridge, logs, toasts } = wiredBridge();
        services().event.emit(EVENT_NAMES.ShowToast, { text: '奧義蓄力中，SP 不足' });
        bridge.unsubscribeEvents();
        assert.equals(1, toasts.filter((t) => t.text === '奧義蓄力中，SP 不足').length);
        assert.isTrue(!logs.includes('奧義蓄力中，SP 不足'));
    });

    suite.test('解除訂閱後不再接收；空字串不顯示', () => {
        const { bridge, toasts } = wiredBridge();
        services().event.emit(EVENT_NAMES.ShowToast, { text: '' });
        bridge.unsubscribeEvents();
        services().event.emit(EVENT_NAMES.AptitudeDialogue, { turn: 1, line: '月黑風高' });
        assert.equals(0, toasts.length);
    });

    suite.test('堡壘受損（PROG-2-1868）：寫進戰報，分敵我；血量不顯示負數', () => {
        const { bridge, logs } = wiredBridge();
        services().event.emit(EVENT_NAMES.FortressDamaged, { faction: Faction.Enemy, hp: 70 });
        services().event.emit(EVENT_NAMES.FortressDamaged, { faction: Faction.Player, hp: -5 });
        bridge.unsubscribeEvents();
        assert.isTrue(logs.includes('工兵攻城：敵方堡壘受損，剩餘 70'));
        assert.isTrue(logs.includes('我方堡壘遭敵軍工兵攻擊，剩餘 0'));
        assert.equals(fortressDamagedLogLine(Faction.Enemy, 12.4), '工兵攻城：敵方堡壘受損，剩餘 12');
    });

    return suite;
}
