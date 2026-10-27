/**
 * PROG-2-1179：暫定派遣任務清單與派遣板列（JRN-03 第三段）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import {
    DISPATCH_JOB_CATALOG, DISPATCH_QUALITY_LABEL, DISPATCH_ROW_TEXT, dispatchBoardRows, dispatchPreviewText, findDispatchJob,
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

    suite.test('PROG-2-1188：預覽自動挑將或指定武將的分數；高風險尾綴；無人可派維持原字串；預設不預覽', () => {
        const session = new GameSession(2);
        const weak = { ...hero('weak', '弱將'), str: 20, int: 20, lea: 20, careerClass: 'Scholar' } as unknown as GeneralConfig;
        session.enrollGenerals([weak, hero('zhao', '趙雲')]);
        const farm = findDispatchJob('FARM')!;
        const farmOf = (generalId?: string) => session.dispatchBoardRows(0, { preview: true, generalId }).find((r) => r.id === 'FARM')!.scoreText;
        const scoreOf = (text: string) => Number(/ (\d+) 分/.exec(text)![1]);
        const zhao = farmOf('zhao');
        const weakText = farmOf('weak');
        assert.isTrue(zhao.startsWith('趙雲 ') && weakText.startsWith('弱將 '), zhao + '／' + weakText);
        assert.equals(dispatchPreviewText({ generalName: '趙雲', score: scoreOf(zhao) }, false), zhao);
        assert.equals(scoreOf(zhao) >= scoreOf(weakText) ? zhao : weakText, farmOf());
        const raid = session.dispatchBoardRows(0, { preview: true }).find((r) => r.id === 'RAID')!.scoreText;
        assert.isTrue(raid.endsWith('・' + DISPATCH_ROW_TEXT.highRisk), raid);
        assert.equals(DISPATCH_ROW_TEXT.available, session.dispatchBoardRows(0).find((r) => r.id === 'FARM')!.scoreText);
        assert.isTrue(session.startDispatchJob(farm, 'zhao', 0)!.ok);
        assert.isTrue(session.startDispatchJob(findDispatchJob('PATROL')!, 'weak', 0)!.ok);
        assert.equals(DISPATCH_ROW_TEXT.available, session.dispatchBoardRows(0, { preview: true }).find((r) => r.id === 'ESCORT')!.scoreText);
        assert.equals('良好', DISPATCH_QUALITY_LABEL.GOOD);
    });

    return suite;
}
