/**
 * NurtureInspireNotice.test.ts — 培育回合顯示教官靈感／羈絆（PROG-2-1096）
 */
import { TestSuite, assert } from './TestRunner';
import { describeMentorTriggers } from '../assets/scripts/ui/core/NurtureFlowController';

export function createNurtureInspireNoticeSuite(): TestSuite {
    const suite = new TestSuite('NurtureInspireNotice (培育靈感／羈絆提示 PROG-2-1096)');
    const mentors = [{ id: 'm1', name: '趙雲' }];

    suite.test('沒有觸發時回傳空字串', () => {
        assert.equals('', describeMentorTriggers(undefined, undefined, mentors));
    });

    suite.test('羈絆顯示名稱', () => {
        assert.equals('【羈絆】龍鳳之誼', describeMentorTriggers('SYN_ZHAO_ZHUGE_01', [], mentors));
    });

    suite.test('靈感顯示教官名與戰法', () => {
        const text = describeMentorTriggers(undefined, [{ mentorId: 'm1', eventId: 'e1', tacticId: '槍陣' }], mentors);
        assert.equals('【靈感】趙雲傳授戰法「槍陣」', text);
    });

    suite.test('有戰法名稱查詢時顯示中文名', () => {
        const names = new Map([['tactic-fire-scheme', '火計']]);
        const text = describeMentorTriggers(undefined, [{ mentorId: 'm1', eventId: 'e1', tacticId: 'tactic-fire-scheme' }], mentors, (id) => names.get(id));
        assert.equals('【靈感】趙雲傳授戰法「火計」', text);
    });

    return suite;
}
