/**
 * CharacterJournalPeek — 人物頁日誌氣泡文字與接線（HUM-06；PROG-2-2075）
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { JournalEntry, JournalState } from '../assets/scripts/core/systems/JournalLog';
import { characterJournalPeekText, JOURNAL_PEEK_MAX_CHARS } from '../assets/scripts/ui/core/CharacterJournalPeek';

function entry(id: string, timestamp: string, summary: string, over: Partial<JournalEntry> = {}): JournalEntry {
    return {
        entryId: id, timestamp, category: 'INTERACTION', relatedGeneralUids: ['G-ZF'],
        priority: 50, summary, visibility: 'VISIBLE', ...over,
    };
}

export function createCharacterJournalPeekSuite(): TestSuite {
    const suite = new TestSuite('CharacterJournalPeek (人物頁日誌氣泡 HUM-06 PROG-2-2075)');

    suite.test('最新一筆可見日誌，時間顯示年＋季；隱藏條目與別人的不算', () => {
        const state: JournalState = {
            entries: [
                entry('J1', '0200-01-01T00:00:00', '張飛於校場操練。'),
                entry('J2', '0200-03-01T00:00:00', '張飛酒後與華雄切磋。'),
                entry('J3', '0200-04-01T00:00:00', '密報', { visibility: 'HIDDEN' }),
                entry('J4', '0200-04-01T00:00:00', '關羽讀春秋。', { relatedGeneralUids: ['G-GY'] }),
            ],
        };
        assert.equals('200年秋：張飛酒後與華雄切磋。', characterJournalPeekText(state, 'G-ZF'));
        assert.equals(null, characterJournalPeekText(state, 'G-ZY'));
    });

    suite.test('太長時截斷加「…」', () => {
        const long = '甲'.repeat(JOURNAL_PEEK_MAX_CHARS + 5);
        const text = characterJournalPeekText({ entries: [entry('J1', '0201-02-01T00:00:00', long)] }, 'G-ZF');
        assert.equals(`201年夏：${'甲'.repeat(JOURNAL_PEEK_MAX_CHARS)}…`, text);
    });

    suite.test('大廳接線：人物頁顯示氣泡，點了開這位武將的日誌', () => {
        const lobby = readFileSync(join(__dirname, '../assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(lobby.includes('this._refreshCharacterDs3JournalPeek();'));
        assert.isTrue(lobby.includes('ensureDs3JournalPeek(host, JOURNAL_PEEK_NODE_NAME)'));
        assert.isTrue(lobby.includes('peek.button.node.on(Button.EventType.CLICK, this._onCharacterDs3JournalClick, this);'));
    });

    return suite;
}
