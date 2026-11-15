/**
 * LobbyHallReturn.test.ts — 轉蛋按「返回政廳」後 UI 堆疊要回到 LobbyMain（PROG-2-9106）
 *
 * 假 UI 堆疊照 UIManager 替換式頁面的行為：open 會把目前頁推進歷史，close 目前頁會翻回上一頁。
 */
import { LOBBY_RETURN_MAX_CLOSES, restoreLobbyMainUi, type LobbyUiStack } from '../assets/scripts/ui/core/LobbyHallReturn';
import { TestSuite, assert } from './TestRunner';

type Id = 'LobbyMain' | 'ShopMain' | 'GachaMain' | 'GeneralList';

function fakeStack(start: Id[], opts: { closeFails?: boolean } = {}) {
    const history: Id[] = start.slice(0, -1);
    let current: Id | null = start.length ? start[start.length - 1] : null;
    const calls: string[] = [];
    const ui: LobbyUiStack<Id> = {
        getCurrentUI: () => current,
        close: async (id) => {
            calls.push(`close:${id}`);
            if (opts.closeFails) return false;
            if (current !== id) return false;
            current = history.pop() ?? null;
            return true;
        },
        open: async (id) => {
            calls.push(`open:${id}`);
            if (current && current !== id) history.push(current);
            current = id;
            return true;
        },
    };
    return { ui, calls, history, current: () => current };
}

export function createLobbyHallReturnSuite(): TestSuite {
    const suite = new TestSuite('LobbyHallReturn');

    suite.test('大廳 → 轉蛋：返回時關掉轉蛋，翻回 LobbyMain', async () => {
        const s = fakeStack(['LobbyMain', 'GachaMain']);
        assert.equals(true, await restoreLobbyMainUi(s.ui, 'LobbyMain'));
        assert.equals('LobbyMain', s.current());
        assert.equals('close:GachaMain', s.calls.join(','));
    });

    suite.test('大廳 → 商城 → 轉蛋：逐頁關回 LobbyMain，歷史清空', async () => {
        const s = fakeStack(['LobbyMain', 'ShopMain', 'GachaMain']);
        assert.equals(true, await restoreLobbyMainUi(s.ui, 'LobbyMain'));
        assert.equals('LobbyMain', s.current());
        assert.equals('close:GachaMain,close:ShopMain', s.calls.join(','));
        assert.equals(0, s.history.length);
    });

    suite.test('已在 LobbyMain：不做任何事', async () => {
        const s = fakeStack(['LobbyMain']);
        assert.equals(true, await restoreLobbyMainUi(s.ui, 'LobbyMain'));
        assert.equals(0, s.calls.length);
    });

    suite.test('歷史裡沒有 LobbyMain：關完後補開 LobbyMain', async () => {
        const s = fakeStack(['GachaMain']);
        assert.equals(true, await restoreLobbyMainUi(s.ui, 'LobbyMain'));
        assert.equals('close:GachaMain,open:LobbyMain', s.calls.join(','));
    });

    suite.test('close 失敗：不無限重試，直接開 LobbyMain', async () => {
        const s = fakeStack(['LobbyMain', 'GachaMain'], { closeFails: true });
        await restoreLobbyMainUi(s.ui, 'LobbyMain');
        assert.equals('close:GachaMain,open:LobbyMain', s.calls.join(','));
        assert.isTrue(s.calls.length <= LOBBY_RETURN_MAX_CLOSES + 1, '呼叫次數有上限');
    });

    return suite;
}
