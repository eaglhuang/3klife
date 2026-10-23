/**
 * JournalReaction.test.ts — 日誌條目的一句武將反應（NPC-04 / PROG-2-1013）
 *
 * Unity 對照：像 PlayMode 測試裡對 Localization 模板做 Format 檢查，
 * 確認每一句填完都在字數內，並且取不到資料時一定有預設句。
 */
import { assert, TestSuite } from './TestRunner';
import {
    canAcceptReactionLine,
    journalReactionLine,
    JOURNAL_REACTION_FALLBACK,
    JOURNAL_REACTION_MAX_CHARS,
    JOURNAL_REACTION_MIN_CHARS,
    JOURNAL_REACTION_TEMPLATES,
} from '../assets/scripts/core/systems/JournalReaction';
import { JOURNAL_CATEGORIES } from '../assets/scripts/core/systems/JournalLog';

export function createJournalReactionSuite(): TestSuite {
    const suite = new TestSuite('JournalReaction (NPC-04 日誌反應模板)');

    suite.test('每個類別的每句模板，填入一般與較長的武將名後都在 20~60 字之間', () => {
        for (const category of JOURNAL_CATEGORIES) {
            for (const template of JOURNAL_REACTION_TEMPLATES[category]) {
                for (const name of ['關羽', '諸葛孔明']) {
                    const text = template.split('{name}').join(name);
                    assert.isTrue(canAcceptReactionLine(text), `${category} 模板填入「${name}」後長度不合格：${text}`);
                    assert.isTrue([...text].length <= JOURNAL_REACTION_MAX_CHARS);
                    assert.isTrue([...text].length >= JOURNAL_REACTION_MIN_CHARS);
                }
            }
        }
    });

    suite.test('同一類別、同一 pick：結果固定；pick 超出範圍時取模，不出錯', () => {
        const entry = { category: 'DISPATCH' as const };
        const first = journalReactionLine(entry, '趙雲', 0);
        assert.equals(first.text, journalReactionLine(entry, '趙雲', 0).text);
        assert.equals(journalReactionLine(entry, '趙雲', 2).text, first.text);
        assert.equals(journalReactionLine(entry, '趙雲', -2).text, first.text);
        assert.equals('TEMPLATE', first.source);
        assert.isTrue(first.text.startsWith('趙雲：'));
    });

    suite.test('pick 為 NaN 或無限大時視為 0，仍產生模板台詞', () => {
        const entry = { category: 'BATTLE' as const };
        assert.equals(journalReactionLine(entry, '呂布', 0).text, journalReactionLine(entry, '呂布', Number.NaN).text);
        assert.equals('TEMPLATE', journalReactionLine(entry, '呂布', Number.POSITIVE_INFINITY).source);
    });

    suite.test('武將名為空或只有空白：回退預設句，來源為 FALLBACK', () => {
        const entry = { category: 'GROWTH' as const };
        const empty = journalReactionLine(entry, '', 0);
        assert.equals(JOURNAL_REACTION_FALLBACK, empty.text);
        assert.equals('FALLBACK', empty.source);
        assert.equals('FALLBACK', journalReactionLine(entry, '   ', 1).source);
    });

    suite.test('台詞檢查：過短、過長、含未填 slot 都拒絕', () => {
        assert.isFalse(canAcceptReactionLine('太短。'));
        assert.isFalse(canAcceptReactionLine('字'.repeat(JOURNAL_REACTION_MAX_CHARS + 1)));
        assert.isFalse(canAcceptReactionLine('這句話有夠長的字數但仍然留著未填的 {name} 佔位符號在裡面'));
        assert.isTrue(canAcceptReactionLine('這是一句長度剛好合格的台詞，用來檢查通過的情況。'));
    });

    return suite;
}
