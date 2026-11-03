/**
 * GraduationRecordController.test.ts — 畢業紀錄畫面控制器（PROG-2-1633 自 LobbyScene 拆出）
 */
import { TestSuite, assert } from './TestRunner';
import { GraduationRecordController } from '../assets/scripts/ui/core/GraduationRecordController';
import type { MentorHoldingsButtonBinding } from '../assets/scripts/ui/core/MentorHoldingsController';
import type { NurtureGraduationRow } from '../assets/scripts/ui/core/NurtureGraduationView';

function row(i: number): NurtureGraduationRow {
    return { sessionId: `s${i}`, periodText: `第${i}期`, ratingText: 'A', tagsText: '勇', tpText: 'TP+3', revelationText: '無' } as NurtureGraduationRow;
}

export function createGraduationRecordControllerSuite(): TestSuite {
    const suite = new TestSuite('GraduationRecordController (畢業紀錄 PROG-2-1633)');

    suite.test('掛載後隱藏；打開回第一頁、翻頁、關閉', async () => {
        let bindings: MentorHoldingsButtonBinding[] = [];
        const texts: Record<string, string> = {};
        const actives: Record<string, boolean> = {};
        const host = {
            node: { active: true },
            binder: {
                setTexts: (t: Record<string, string>) => { Object.assign(texts, t); },
                setActives: (a: Record<string, boolean>) => { Object.assign(actives, a); },
            },
        };
        const ctrl = new GraduationRecordController({
            mountHost: async (b) => { bindings = b; return host; },
            rows: () => Array.from({ length: 7 }, (_, i) => row(i)),
        });
        const click = (id: string) => bindings.find((b) => b.buttonId === id)?.handler();
        await ctrl.mount();
        assert.isFalse(host.node.active);
        ctrl.setOpen(true);
        assert.isTrue(host.node.active);
        assert.equals('1 / 2', texts.graduationPage);
        assert.equals('第0期　A\n勇　TP+3　無', texts.graduationRow0);
        click('btnGradNext');
        assert.equals('2 / 2', texts.graduationPage);
        assert.isFalse(actives.graduationRow2Box);
        ctrl.setOpen(true);
        assert.equals('1 / 2', texts.graduationPage);
        click('btnGradClose');
        assert.isFalse(host.node.active);
    });

    return suite;
}
