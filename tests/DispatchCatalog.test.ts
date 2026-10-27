/**
 * PROG-2-1179：暫定派遣任務清單與派遣板列（JRN-03 第三段）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import {
    DISPATCH_JOB_CATALOG, DISPATCH_ROW_TEXT, dispatchBoardRows, findDispatchJob,
} from '../assets/scripts/core/systems/DispatchCatalog';
import { EMPTY_DISPATCH_STATE, startDispatch } from '../assets/scripts/core/systems/DispatchJobs';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const HOUR = 60 * 60 * 1000;
const JOURNAL_CATEGORIES = ['BATTLE', 'DISPATCH', 'INTERACTION', 'GROWTH', 'SYSTEM'];

function hero(id: string, name: string): GeneralConfig {
    return { id, name, faction: 'shu', hp: 1000, str: 80, int: 70, lea: 80, pol: 60, cha: 70, careerClass: 'Warrior' } as unknown as GeneralConfig;
}

export function createDispatchCatalogSuite(): TestSuite {
    const suite = new TestSuite('DispatchCatalog (PROG-2-1179 暫定派遣清單)');

    suite.test('清單：id 不重複、時長為正、故事標籤屬日誌類別、至少一個高風險', () => {
        const ids = DISPATCH_JOB_CATALOG.map((j) => j.jobId);
        assert.equals(ids.length, new Set(ids).size);
        for (const job of DISPATCH_JOB_CATALOG) {
            assert.isTrue(job.durationMs > 0);
            assert.isTrue(job.name.length > 0 && job.rewardText.length > 0);
            assert.isTrue(job.storyTags.every((t) => JOURNAL_CATEGORIES.includes(t)));
        }
        assert.isTrue(DISPATCH_JOB_CATALOG.some((j) => j.highRisk === true));
        assert.equals('邊境巡查', findDispatchJob('PATROL')?.name ?? '');
        assert.isTrue(findDispatchJob('NOPE') === null);
    });

    suite.test('dispatchBoardRows：進行中排前面顯示剩餘時數，高風險需親自決策', () => {
        const patrol = findDispatchJob('PATROL')!;
        const state = startDispatch(EMPTY_DISPATCH_STATE, patrol, 'g1', { roleTags: [], stats: {}, journalTags: [] }, 0).state;
        const rows = dispatchBoardRows(state, DISPATCH_JOB_CATALOG, (id) => (id === 'g1' ? '趙雲' : id), HOUR + 1);
        assert.equals(DISPATCH_JOB_CATALOG.length, rows.length);
        assert.equals('PATROL', rows[0].id);
        assert.equals('趙雲・剩 3 時', rows[0].scoreText);
        assert.equals(DISPATCH_ROW_TEXT.highRisk, rows.find((r) => r.id === 'RAID')!.scoreText);
        assert.equals(DISPATCH_ROW_TEXT.available, rows.find((r) => r.id === 'FARM')!.scoreText);
        const overdue = dispatchBoardRows(state, DISPATCH_JOB_CATALOG, (id) => id, 9 * HOUR);
        assert.equals('g1・剩 0 時', overdue[0].scoreText);
    });

    suite.test('GameSession.dispatchBoardRows：派遣後用武將名顯示', () => {
        const session = new GameSession(1);
        session.enrollGenerals([hero('zhao', '趙雲')]);
        assert.equals(DISPATCH_ROW_TEXT.available, session.dispatchBoardRows(0)[0].scoreText);
        assert.isTrue(session.startDispatchJob(findDispatchJob('FARM')!, 'zhao', 0)!.ok);
        const rows = session.dispatchBoardRows(0);
        assert.equals('FARM', rows[0].id);
        assert.equals('趙雲・剩 6 時', rows[0].scoreText);
    });

    return suite;
}
