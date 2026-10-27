/**
 * BattleResultBackToLobby.test.ts — 戰鬥結果彈窗「返回」要接回大廳（MVP 循環斷點）
 *
 * Unity 對照：結算面板的 Back 按鈕 onClick 必須有人訂閱，否則玩家打完仗就卡在戰場，
 * 結緣→培育→戰場→傳承的循環斷掉。
 */
import { BattleUIBridge, createBattleSceneContext } from '../assets/scripts/battle/views/BattleUIBridge';
import { TestSuite, assert } from './TestRunner';

type Handler = (...args: any[]) => void;

function fakeNode() {
    const handlers = new Map<string, Handler>();
    return {
        handlers,
        on: (name: string, fn: Handler) => { handlers.set(name, fn); },
        off: (name: string) => { handlers.delete(name); },
        emit: (name: string) => handlers.get(name)?.(),
    };
}

const noop = () => undefined;

export function createBattleResultBackToLobbySuite(): TestSuite {
    const suite = new TestSuite('BattleResultBackToLobby');

    suite.test('結果彈窗 back 事件會呼叫 onBack，replay 仍走 onReplay', () => {
        const node = fakeNode();
        const ctx = createBattleSceneContext();
        ctx.resultPopup = { node, showResult: noop } as any;
        const bridge = new BattleUIBridge(ctx, {} as any);
        let back = 0;
        let replay = 0;
        bridge.subscribeEvents({
            onEndTurn: noop, onPlayerDeployed: noop, onTactics: noop, onGeneralDuelRequest: noop,
            onReplay: () => { replay++; },
            onBack: () => { back++; },
        });
        node.emit('back');
        node.emit('replay');
        assert.equals(1, back, 'back 應觸發一次 onBack');
        assert.equals(1, replay, 'replay 應觸發一次 onReplay');

        bridge.unsubscribeEvents();
        assert.equals(false, node.handlers.has('back'), '解除訂閱後 back 綁定應移除');
    });

    return suite;
}
