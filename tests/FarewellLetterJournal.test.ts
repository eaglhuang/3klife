/**
 * FarewellLetterJournal.test.ts — 傭兵告別信寫進日誌，玩家才讀得到（PROG-2-2108）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import {
    createFarewellLetter, FAREWELL_JOURNAL_PRIORITY, farewellJournalEntry,
} from '../assets/scripts/core/systems/FarewellLetterInbox';
import type { MercenarySaveBundle } from '../assets/scripts/core/systems/MercenarySaveModel';

function bundleWith(affection: number): MercenarySaveBundle {
    return {
        mercenaries: [{ uid: 'merc-1', daysLeft: 1, bond: 0, status: 'Trial', generalId: 'gen-1', affection }],
        upkeep: [{ uid: 'merc-1', status: 'Active', unpaidDays: 0, frozenDaysLeft: 0 }],
        cooldowns: [],
    } as unknown as MercenarySaveBundle;
}

/** 試用倒數 1 天：第 1 日歸零仍在隊，第 2 日離隊。 */
async function departWith(affection: number): Promise<GameSession> {
    const session = new GameSession(1);
    session.setMercenaries(bundleWith(affection));
    await session.advanceMercenaryDay();
    await session.advanceMercenaryDay();
    return session;
}

function farewells(session: GameSession) {
    return session.queryJournal().filter((entry) => entry.entryId.startsWith('FAREWELL-'));
}

export function createFarewellLetterJournalSuite(): TestSuite {
    const suite = new TestSuite('FarewellLetterJournal (告別信進日誌 PROG-2-2108)');

    suite.test('條目：內容是信件全文，掛在該傭兵名下，ID 跟著信件', () => {
        const letter = createFarewellLetter({ uid: 'm', generalName: '甲', affection: 25, day: 3 })!;
        const entry = farewellJournalEntry(letter, 'T');
        assert.equals(`FAREWELL-${letter.id}`, entry.entryId);
        assert.equals('T', entry.timestamp);
        assert.equals('INTERACTION', entry.category);
        assert.equals('m', entry.relatedGeneralUids.join(','));
        assert.equals(FAREWELL_JOURNAL_PRIORITY, entry.priority);
        assert.equals(`甲來信：${letter.body}`, entry.summary);
    });

    suite.test('好感足夠離隊：寫一則日誌，內容與收件匣那封信相同', async () => {
        const session = await departWith(25);
        const entries = farewells(session);
        assert.equals(1, entries.length);
        assert.isTrue(entries[0].summary.includes(session.farewellLetters[0].body));
    });

    suite.test('好感不足 20 離隊：沒有信，也沒有日誌', async () => {
        const session = await departWith(0);
        assert.equals(0, session.farewellLetters.length);
        assert.equals(0, farewells(session).length);
    });

    suite.test('離隊之後再過幾天不重複寫', async () => {
        const session = await departWith(25);
        await session.advanceMercenaryDay();
        await session.advanceMercenaryDay();
        assert.equals(1, farewells(session).length);
    });

    suite.test('下次登入的晨報讀得到告別信', async () => {
        const session = await departWith(25);
        session.recordLoginAt(Date.now());
        const hit = session.morningReport.items.filter((item) => item.entryId.startsWith('FAREWELL-'));
        assert.equals(1, hit.length);
    });

    return suite;
}
