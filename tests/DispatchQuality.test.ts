/**
 * PROG-2-1177：派遣品質評分（JRN-03 第一段）
 */
import { assert, TestSuite } from './TestRunner';
import {
    canAutoDispatch, dispatchCompleteLine, dispatchQualityOf, getDispatchScore, getJournalAffinity, getMoodModifier,
    getRoleFit, getStatFit, type DispatchGeneral, type DispatchJob,
} from '../assets/scripts/core/systems/DispatchQuality';

const JOB: DispatchJob = {
    jobId: 'J1', name: '邊境巡查', tags: ['scout', 'cavalry'], requiredStats: { lea: 80, str: 60 }, storyTags: ['border'],
};

export function createDispatchQualitySuite(): TestSuite {
    const suite = new TestSuite('DispatchQuality (PROG-2-1177 派遣品質評分)');

    suite.test('子項：角色契合、能力契合、日誌親和取比例，沒有要求為 1', () => {
        assert.equals(0.5, getRoleFit(['scout', 'cavalry'], ['scout']));
        assert.equals(1, getRoleFit([], []));
        assert.equals(0.75, getStatFit({ lea: 80, str: 60 }, { lea: 40, str: 90 }));
        assert.equals(1, getStatFit({}, {}));
        assert.equals(0, getStatFit({ int: 50 }, {}));
        assert.equals(1, getJournalAffinity(['border'], ['border', 'battle']));
        assert.equals(0.6, getMoodModifier(undefined));
    });

    suite.test('公式：45／25／15／15 加權後四捨五入', () => {
        const full: DispatchGeneral = { roleTags: ['scout', 'cavalry'], stats: { lea: 90, str: 70 }, mood: 'HIGH', journalTags: ['border'] };
        assert.equals(100, getDispatchScore(JOB, full));
        const half: DispatchGeneral = { roleTags: ['scout'], stats: { lea: 40, str: 90 }, journalTags: [] };
        // 0.5×45 + 0.75×25 + 0.6×15 + 0×15 = 22.5 + 18.75 + 9 = 50.25
        assert.equals(50, getDispatchScore(JOB, half));
    });

    suite.test('品質區間：40／60／80 為門檻，非有限數視為 0', () => {
        assert.equals('POOR', dispatchQualityOf(39));
        assert.equals('NORMAL', dispatchQualityOf(40));
        assert.equals('GOOD', dispatchQualityOf(79));
        assert.equals('EXCELLENT', dispatchQualityOf(80));
        assert.equals('POOR', dispatchQualityOf(Number.NaN));
    });

    suite.test('高風險任務不可自動派遣；完成句套用規格模板', () => {
        assert.isTrue(canAutoDispatch(JOB));
        assert.isFalse(canAutoDispatch({ ...JOB, highRisk: true }));
        assert.equals('趙雲 已完成『邊境巡查』，帶回 糧草 50。', dispatchCompleteLine('趙雲', '邊境巡查', '糧草 50'));
    });

    return suite;
}
