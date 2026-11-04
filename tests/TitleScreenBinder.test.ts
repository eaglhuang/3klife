/**
 * TitleScreenBinder.test.ts — 遊戲入口標題畫面點擊接線（UI-2-0158）
 */
import { assert, TestSuite } from './TestRunner';
import { TitleScreenBinder } from '../assets/scripts/ui/core/TitleScreenBinder';

const TAP = 'touch-end';

type TapEvent = { propagationStopped?: boolean };

class FakeNode {
    active = true;
    readonly handlers = new Map<string, (event?: TapEvent) => void>();
    constructor(readonly name: string, readonly children: FakeNode[] = [], public _ucufId?: string) {}
    on(event: string, handler: (event?: TapEvent) => void): void { this.handlers.set(event, handler); }
    off(event: string): void { this.handlers.delete(event); }
    /** 模擬觸控：先觸發自己，事件沒被攔下就冒泡到 parent 鏈 */
    tap(chain: FakeNode[]): void {
        const event: TapEvent = {};
        for (const node of [this, ...chain]) {
            node.handlers.get(TAP)?.(event);
            if (event.propagationStopped) return;
        }
    }
}

function screen(): { root: FakeNode; start: FakeNode; notice: FakeNode; settings: FakeNode; account: FakeNode; side: FakeNode } {
    const start = new FakeNode('div_10', [], 'title-screen.start');
    const notice = new FakeNode('div_14', [], 'title-screen.notice');
    const settings = new FakeNode('div_18', [], 'title-screen.settings');
    const account = new FakeNode('div_22', [], 'title-screen.account');
    const side = new FakeNode('div_13', [notice, settings, account]);
    const root = new FakeNode('TitleScreen', [new FakeNode('div_5'), start, side]);
    return { root, start, notice, settings, account, side };
}

export function createTitleScreenBinderSuite(): TestSuite {
    const suite = new TestSuite('TitleScreenBinder');

    suite.test('點開始遊戲或畫面任意處都進入，只進入一次', () => {
        const s = screen();
        let count = 0;
        const binder = new TitleScreenBinder(s.root, TAP, { onStart: () => { count++; } });
        s.start.tap([s.root]);
        s.root.tap([]);
        assert.equals(count, 1, '連點只觸發一次');
        assert.equals(binder.started, true, 'started');
    });

    suite.test('沒給動作的左下按鈕隱藏，不綁點擊', () => {
        const s = screen();
        new TitleScreenBinder(s.root, TAP, { onStart: () => undefined, onSide: { settings: () => undefined } });
        assert.equals(s.notice.active, false, '公告隱藏');
        assert.equals(s.account.active, false, '帳號隱藏');
        assert.equals(s.settings.active, true, '設定顯示');
        assert.equals(s.notice.handlers.has(TAP), false, '公告不綁');
    });

    suite.test('左下按鈕攔下事件，不會冒泡成進入遊戲', () => {
        const s = screen();
        let started = 0;
        let opened = 0;
        new TitleScreenBinder(s.root, TAP, { onStart: () => { started++; }, onSide: { notice: () => { opened++; } } });
        s.notice.tap([s.side, s.root]);
        assert.equals(opened, 1, '開公告');
        assert.equals(started, 0, '沒有進入遊戲');
    });

    suite.test('畫面缺開始鈕時，點畫面仍可進入', () => {
        const root = new FakeNode('TitleScreen', [new FakeNode('div_5')]);
        let count = 0;
        new TitleScreenBinder(root, TAP, { onStart: () => { count++; } });
        root.tap([]);
        assert.equals(count, 1, '整頁點擊');
    });

    return suite;
}
