import { assert, TestSuite } from './TestRunner';
import {
    applyVolunteerBonus,
    HallVolunteerGeneral,
    HallVolunteerTask,
    markVolunteerShown,
    shouldShowVolunteerEvent,
    sortVolunteersFirst,
} from '../assets/scripts/core/systems/HallVolunteer';

const TASK: HallVolunteerTask = { id: 'bandit', tags: ['剿匪', '北境'], flags: [] };
const EAGER_ZHANG: HallVolunteerGeneral = { id: 'zhang-fei', roleTags: ['剿匪'], mood: 'EAGER' };
const CALM_GUAN: HallVolunteerGeneral = { id: 'guan-yu', roleTags: ['剿匪'], mood: 'CALM' };
const EAGER_NO_TAG: HallVolunteerGeneral = { id: 'sun-ce', roleTags: ['水戰'], mood: 'EAGER' };

export function createHallVolunteerSuite(): TestSuite {
    const suite = new TestSuite('HallVolunteer (HALL-06 自告奮勇彩蛋)');

    suite.test('F-2 判定：標籤相符且情緒 EAGER 才觸發', () => {
        assert.isTrue(shouldShowVolunteerEvent(TASK, EAGER_ZHANG));
        assert.isFalse(shouldShowVolunteerEvent(TASK, CALM_GUAN));
        assert.isFalse(shouldShowVolunteerEvent(TASK, EAGER_NO_TAG));
    });

    suite.test('一次性演出：標記後不再觸發，且不改原任務', () => {
        const shown = markVolunteerShown(TASK);
        assert.isTrue(shown.flags.includes('VOLUNTEER_SHOWN'));
        assert.isFalse(shouldShowVolunteerEvent(shown, EAGER_ZHANG));
        assert.equals(0, TASK.flags.length);
        assert.equals(1, markVolunteerShown(shown).flags.filter(f => f === 'VOLUNTEER_SHOWN').length);
    });

    suite.test('下拉排序：自告奮勇者在前，其餘保持原順序', () => {
        const sorted = sortVolunteersFirst([CALM_GUAN, EAGER_NO_TAG, EAGER_ZHANG], TASK);
        assert.equals('zhang-fei', sorted[0].id);
        assert.equals('guan-yu', sorted[1].id);
        assert.equals('sun-ce', sorted[2].id);
        assert.equals(3, sorted.length);
    });

    suite.test('成功率加成：自告奮勇 +0.5，上限 1，非自告奮勇不變', () => {
        assert.equals(0.8, applyVolunteerBonus(0.3, true));
        assert.equals(1, applyVolunteerBonus(0.7, true));
        assert.equals(0.3, applyVolunteerBonus(0.3, false));
    });

    suite.test('成功率輸入非法時夾回 0~1', () => {
        assert.equals(0, applyVolunteerBonus(-0.5, false));
        assert.equals(1, applyVolunteerBonus(9, false));
        assert.equals(0, applyVolunteerBonus(Number.NaN, false));
    });

    return suite;
}
