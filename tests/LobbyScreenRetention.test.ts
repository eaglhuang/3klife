// @spec-source → Issue #2120；PROG-2-9018 大廳介面停放前拔外來監聽
import { assert, TestSuite } from './TestRunner';
import { purgeForeignListeners } from '../assets/scripts/ui/scenes/LobbyScreenRetention';

interface Info { callback: () => void; target?: unknown }
function fakeTree() {
    const table: Record<string, { callbackInfos: Info[] }> = {};
    const invoker = {
        _callbackTable: table,
        off: (key: string, cb: unknown, target: unknown) => {
            table[key].callbackInfos = table[key].callbackInfos.filter((i) => !(i.callback === cb && i.target === target));
        },
    };
    const childComp = { name: 'inner' };
    const child: any = { components: [childComp], eventProcessor: { bubblingTarget: null, capturingTarget: null } };
    const root: any = { components: [], eventProcessor: { bubblingTarget: invoker, capturingTarget: null } };
    const all = [root, child];
    root.walk = (fn: (n: unknown) => void) => all.forEach(fn);
    return { root, table, childComp };
}

export function createLobbyScreenRetentionSuite(): TestSuite {
    const suite = new TestSuite('LobbyScreenRetention');

    suite.test('停放前拔掉舊場景（樹外目標）的監聽，保留樹內元件與無目標閉包', () => {
        const { root, table, childComp } = fakeTree();
        const oldScene = { name: 'old LobbyScene' };
        const noop = () => undefined;
        table.click = { callbackInfos: [
            { callback: noop, target: oldScene },
            { callback: noop, target: childComp },
            { callback: noop },
        ] };
        const removed = purgeForeignListeners(root);
        assert.equals(1, removed);
        assert.equals(2, table.click.callbackInfos.length);
        assert.isTrue(table.click.callbackInfos.every((i) => i.target !== oldScene));
    });

    suite.test('沒有事件處理器的節點不會出錯', () => {
        const root: any = { components: [], walk: (fn: (n: unknown) => void) => fn(root) };
        assert.equals(0, purgeForeignListeners(root));
    });

    return suite;
}
