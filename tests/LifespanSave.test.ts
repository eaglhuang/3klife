/**
 * LifespanSave.test.ts — 領地治理存檔欄位的讀檔校正（PROG-2-0975）
 */
import { assert, TestSuite } from './TestRunner';
import {
    defaultKeepTerritories,
    normalizeGovernanceAssignments,
    normalizeJournalEntries,
    normalizeKeepTerritories,
} from '../assets/scripts/core/systems/LifespanSave';

export function createLifespanSaveSuite(): TestSuite {
    const suite = new TestSuite('LifespanSave (PROG-2-0975 領地治理讀檔校正)');

    suite.test('指派：不合法任務、空武將 ID、非物件項目丟棄；同一任務或同一武將只留第一筆', () => {
        const result = normalizeGovernanceAssignments([
            { task: 'farming', generalUid: 'G010' },
            { task: 'mining', generalUid: 'G020' },
            { task: 'commerce', generalUid: '' },
            { task: 'farming', generalUid: 'G030' },
            { task: 'arms', generalUid: 'G010' },
            'junk',
            { task: 'scouting', generalUid: 'G040' },
        ]);
        assert.equals(2, result.length);
        assert.equals('G010', result[0].generalUid);
        assert.equals('scouting', result[1].task);
    });

    suite.test('指派：非陣列或缺欄位回傳空陣列', () => {
        assert.equals(0, normalizeGovernanceAssignments(undefined).length);
        assert.equals(0, normalizeGovernanceAssignments('oops').length);
    });

    suite.test('領地：缺主城時回到預設清單，保證玩家至少有主城', () => {
        const result = normalizeKeepTerritories([{ id: 'a', isHome: false }]);
        assert.equals(1, result.length);
        assert.isTrue(result[0].isHome);
    });

    suite.test('領地：只保留第一個主城，重複 ID 與非法項目丟棄', () => {
        const result = normalizeKeepTerritories([
            { id: 'home-city', isHome: true },
            { id: 'home-2', isHome: true },
            { id: 'a', isHome: false },
            { id: 'a', isHome: false },
            { id: '', isHome: false },
            { id: 'b', isHome: 'yes' },
        ]);
        assert.equals(2, result.length);
        assert.equals('home-city', result[0].id);
        assert.equals('a', result[1].id);
    });

    suite.test('領地：未給欄位時回傳預設（只有主城）', () => {
        assert.equals(JSON.stringify(defaultKeepTerritories()), JSON.stringify(normalizeKeepTerritories(undefined)));
    });

    suite.test('日誌：逐筆套用寫入驗證，不合法與重複 ID 的條目丟棄，保留輸入順序', () => {
        const valid = {
            entryId: 'JR_0001',
            timestamp: '2026-04-11T06:00:00',
            category: 'DISPATCH',
            relatedGeneralUids: ['G010'],
            priority: 80,
            summary: '趙雲完成邊境巡查。',
            visibility: 'VISIBLE',
        };
        const result = normalizeJournalEntries([
            valid,
            { ...valid, entryId: 'JR_0002', category: 'MYSTERY' },
            { ...valid, entryId: 'JR_0003', priority: 999 },
            { ...valid, entryId: 'JR_0001' },
            { ...valid, entryId: 'JR_0004', timestamp: 'bad' },
            { ...valid, entryId: 'JR_0005', timestamp: '2026-04-12T06:00:00' },
        ]);
        assert.equals(2, result.length);
        assert.equals('JR_0001', result[0].entryId);
        assert.equals('JR_0005', result[1].entryId);
    });

    return suite;
}
