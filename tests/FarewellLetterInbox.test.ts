/**
 * FarewellLetterInbox.test.ts — 傭兵告別信分級、收件匣與已讀（PROG-2-0982）
 */
import { assert, TestSuite } from './TestRunner';
import {
    appendFarewellLetter,
    createFarewellLetter,
    FAREWELL_INBOX_LIMIT,
    farewellTierOf,
    markFarewellLetterRead,
    unreadFarewellCount,
} from '../assets/scripts/core/systems/FarewellLetterInbox';

export function createFarewellLetterInboxSuite(): TestSuite {
    const suite = new TestSuite('FarewellLetterInbox (PROG-2-0982 告別信收件匣)');

    suite.test('好感 <20 不寫信；20–39 普通；40 以上感人', () => {
        assert.isTrue(farewellTierOf(19) === null);
        assert.equals('normal', farewellTierOf(20)!);
        assert.equals('normal', farewellTierOf(39)!);
        assert.equals('moving', farewellTierOf(40)!);
        assert.isTrue(createFarewellLetter({ uid: 'M1', generalName: '關羽', affection: 19, day: 6 }) === null);
    });

    suite.test('告別信帶武將名、分級與未讀狀態，ID 由 uid 與日序組成', () => {
        const letter = createFarewellLetter({ uid: 'M1', generalName: '關羽', affection: 25, day: 6 })!;
        assert.equals('FL-M1-6', letter.id);
        assert.equals('normal', letter.tier);
        assert.isFalse(letter.read);
        assert.isTrue(letter.body.includes('關羽'));
    });

    suite.test('同 ID 不重複加入收件匣，且不改輸入', () => {
        const letter = createFarewellLetter({ uid: 'M1', generalName: '關羽', affection: 45, day: 6 })!;
        const inbox = appendFarewellLetter([], letter);
        const again = appendFarewellLetter(inbox, letter);
        assert.equals(1, again.length);
        assert.equals(1, inbox.length);
        assert.equals('moving', again[0].tier);
    });

    suite.test('標記已讀只影響指定信件，未讀數隨之減少', () => {
        const a = createFarewellLetter({ uid: 'M1', generalName: '關羽', affection: 30, day: 6 })!;
        const b = createFarewellLetter({ uid: 'M2', generalName: '張飛', affection: 30, day: 6 })!;
        const inbox = appendFarewellLetter(appendFarewellLetter([], a), b);
        assert.equals(2, unreadFarewellCount(inbox));
        const next = markFarewellLetterRead(inbox, a.id);
        assert.isTrue(next[0].read);
        assert.isFalse(next[1].read);
        assert.equals(1, unreadFarewellCount(next));
        assert.isFalse(inbox[0].read);
    });

    suite.test('收件匣上限 50 封：超過時丟棄最舊的信', () => {
        let inbox: ReturnType<typeof appendFarewellLetter> = [];
        for (let day = 1; day <= FAREWELL_INBOX_LIMIT + 2; day++) {
            const letter = createFarewellLetter({ uid: 'M1', generalName: '關羽', affection: 30, day })!;
            inbox = appendFarewellLetter(inbox, letter);
        }
        assert.equals(FAREWELL_INBOX_LIMIT, inbox.length);
        assert.equals(3, inbox[0].day);
        assert.equals(FAREWELL_INBOX_LIMIT + 2, inbox[inbox.length - 1].day);
    });

    suite.test('找不到的 ID 標記已讀時不變動', () => {
        const a = createFarewellLetter({ uid: 'M1', generalName: '關羽', affection: 30, day: 6 })!;
        const inbox = appendFarewellLetter([], a);
        const next = markFarewellLetterRead(inbox, 'FL-NOPE-1');
        assert.equals(1, unreadFarewellCount(next));
    });

    return suite;
}
