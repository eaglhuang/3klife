// @spec-source → 武將日誌與離線互動系統.md (doc_spec_0015) §G 離線支援；PROG-2-1741
import { TestSuite, assert } from './TestRunner';
import { OFFLINE_BATTLE_JOURNAL, OFFLINE_SUPPORT_KEY, offlineRaidJournal } from '../assets/scripts/core/systems/OfflineBattleSnapshot';

export function createOfflineSupportJournalSuite(): TestSuite {
    const suite = new TestSuite('OfflineSupportJournal');

    suite.test('告捷且有主將：用離線支援句並帶查表 key', () => {
        const j = offlineRaidJournal(true, '張飛');
        assert.equals('張飛 代你鎮住局面，留下了一份戰況摘要。', j.summary);
        assert.equals(OFFLINE_SUPPORT_KEY, j.summaryKey);
        assert.equals('張飛', j.summaryArgs?.[0]);
        assert.equals(OFFLINE_BATTLE_JOURNAL.win.priority, j.priority);
    });

    suite.test('失利或沒有主將：維持原句、不帶 key', () => {
        const lose = offlineRaidJournal(false, '張飛');
        assert.equals(OFFLINE_BATTLE_JOURNAL.lose.summary, lose.summary);
        assert.equals(undefined, lose.summaryKey);
        const noLead = offlineRaidJournal(true, '  ');
        assert.equals(OFFLINE_BATTLE_JOURNAL.win.summary, noLead.summary);
        assert.equals(undefined, noLead.summaryKey);
    });

    return suite;
}
