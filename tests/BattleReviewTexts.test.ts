// @spec-source → 武將日誌與離線互動系統.md (doc_spec_0015) §H UI_OFFLINE_BATTLE_SNAPSHOT；PROG-2-1743
import { TestSuite, assert } from './TestRunner';
import { BattleReviewController } from '../assets/scripts/ui/core/BattleReviewController';
import { appendOfflineBattleSnapshot, nextOfflineBattleSnapshotId, type OfflineBattleSnapshot } from '../assets/scripts/core/systems/OfflineBattleSnapshot';
import type { JournalEntry } from '../assets/scripts/core/systems/JournalLog';

function oneSnapshot(): OfflineBattleSnapshot[] {
    return appendOfflineBattleSnapshot([], nextOfflineBattleSnapshotId([]), {
        battleType: 'AUTO_RESOLVE', seed: 's0', lineup: [0], tileState: {}, tactics: [], win: true, playerStrength: 300, enemyStrength: 100,
    }).snapshots;
}

function supportEntry(ref: string): JournalEntry {
    return {
        entryId: 'E-1', timestamp: '0194-02-01T00:00:00', category: 'BATTLE', relatedGeneralUids: [], priority: 70,
        summary: '張飛 代你鎮住局面，留下了一份戰況摘要。', visibility: 'VISIBLE', snapshotRef: ref,
        summaryKey: 'UI_JOURNAL_STORY_OFFLINE_SUPPORT', summaryArgs: ['張飛'],
    } as JournalEntry;
}

export function createBattleReviewTextsSuite(): TestSuite {
    const suite = new TestSuite('BattleReviewTexts');

    suite.test('沒有查表時標題用 zh-TW「戰況摘要」、摘要用原句', () => {
        const snaps = oneSnapshot();
        const c = new BattleReviewController({ snapshots: () => snaps, journal: () => [supportEntry(snaps[0].snapshotId)] });
        const view = c.getFlowView();
        assert.equals('戰況摘要', view.texts.reviewTitle);
        assert.isTrue(view.texts.reviewLine0.includes('張飛 代你鎮住局面'));
    });

    suite.test('有查表時標題與帶 key 的摘要換成譯文', () => {
        const snaps = oneSnapshot();
        const lookup = (key: string, ...args: string[]) =>
            key === 'UI_OFFLINE_BATTLE_SNAPSHOT' ? 'Battle Summary' : key === 'UI_JOURNAL_STORY_OFFLINE_SUPPORT' ? `${args[0]} held the line.` : key;
        const c = new BattleReviewController({ snapshots: () => snaps, journal: () => [supportEntry(snaps[0].snapshotId)], lookup });
        const view = c.getFlowView();
        assert.equals('Battle Summary', view.texts.reviewTitle);
        assert.isTrue(view.texts.reviewLine0.includes('張飛 held the line.'));
    });

    return suite;
}
