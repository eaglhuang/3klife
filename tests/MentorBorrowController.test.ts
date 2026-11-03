/**
 * MentorBorrowController.test.ts — 好友借將清單控制器（PROG-2-1633 自 LobbyScene 拆出）
 */
import { TestSuite, assert } from './TestRunner';
import { MentorBorrowController } from '../assets/scripts/ui/core/MentorBorrowController';
import type { MentorHoldingsButtonBinding } from '../assets/scripts/ui/core/MentorHoldingsController';
import type { MentorBorrowRow } from '../assets/scripts/ui/core/MentorBorrowView';

function row(i: number, enabled = true): MentorBorrowRow {
    return { friendId: `f${i}`, name: `友${i}`, rankText: `★${i}`, enabled, statusText: enabled ? '可借用' : '今日已借' };
}

function harness(rows: MentorBorrowRow[], selectResult = true) {
    const log = { selected: [] as string[], records: 0, texts: {} as Record<string, string>, actives: {} as Record<string, boolean> };
    let bindings: MentorHoldingsButtonBinding[] = [];
    const host = {
        node: { active: true },
        binder: {
            setTexts: (t: Record<string, string>) => { Object.assign(log.texts, t); },
            setActives: (a: Record<string, boolean>) => { Object.assign(log.actives, a); },
        },
    };
    const ctrl = new MentorBorrowController({
        mountHost: async (b) => { bindings = b; return host; },
        rows: () => rows,
        select: async (r) => { log.selected.push(r.friendId); return selectResult; },
        openRecord: () => { log.records++; },
    });
    const click = (id: string) => bindings.find((b) => b.buttonId === id)?.handler();
    return { ctrl, host, log, click };
}

export function createMentorBorrowControllerSuite(): TestSuite {
    const suite = new TestSuite('MentorBorrowController (好友借將清單 PROG-2-1633)');

    suite.test('掛載後隱藏；打開從第一頁顯示列文字與按鈕字', async () => {
        const h = harness(Array.from({ length: 6 }, (_, i) => row(i, i !== 1)));
        await h.ctrl.mount();
        assert.isFalse(h.host.node.active);
        h.ctrl.open();
        assert.isTrue(h.host.node.active);
        assert.equals('1 / 2', h.log.texts.borrowPage);
        assert.equals('友0　★0\n可借用', h.log.texts.borrowRow0);
        assert.equals('借用', h.log.texts.borrowRow0Btn);
        assert.equals('—', h.log.texts.borrowRow1Btn);
        h.click('btnBorrowNext');
        assert.equals('2 / 2', h.log.texts.borrowPage);
        assert.isFalse(h.log.actives.borrowRow1Box);
    });

    suite.test('選不可借的列不動作；選可借的列成功後關閉', async () => {
        const h = harness([row(0), row(1, false)]);
        await h.ctrl.mount();
        h.ctrl.open();
        await h.ctrl.selectRow(1);
        assert.equals(0, h.log.selected.length);
        assert.isTrue(h.host.node.active);
        await h.ctrl.selectRow(0);
        assert.equals('f0', h.log.selected.join(','));
        assert.isFalse(h.host.node.active);
    });

    suite.test('宿主設定失敗時清單保持開啟；借用紀錄鈕關清單並開紀錄', async () => {
        const h = harness([row(0)], false);
        await h.ctrl.mount();
        h.ctrl.open();
        await h.ctrl.selectRow(0);
        assert.isTrue(h.host.node.active);
        h.click('btnBorrowRecord');
        assert.isFalse(h.host.node.active);
        assert.equals(1, h.log.records);
    });

    return suite;
}
