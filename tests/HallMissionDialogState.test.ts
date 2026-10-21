import { assert, TestSuite } from './TestRunner';
import { hallAssignNoticeOf, hallMissionDialogStateOf } from '../assets/scripts/ui/core/HallMissionDialogState';
import type { HallTaskRow } from '../assets/scripts/core/systems/HallMissionBoardPresenter';

const ROW: HallTaskRow = {
    taskId: 'mil-01',
    title: '討伐黃巾',
    brief: '清剿汝南一帶殘部',
    difficultyText: '普通',
    requiredRankText: '階位 2',
    rewardText: '糧草 300',
    accepted: false,
    canAccept: true,
};

export function createHallMissionDialogStateSuite(): TestSuite {
    const suite = new TestSuite('HallMissionDialogState (PROG-2-1007 任務彈窗文字)');

    suite.test('列資料轉成彈窗 state：類型、標題、簡述與獎勵', () => {
        const state = hallMissionDialogStateOf(ROW, '軍事');
        assert.equals('軍事', state.missionTypeLabel);
        assert.equals('討伐黃巾', state.missionTitle);
        assert.equals('清剿汝南一帶殘部', state.missionBrief);
        assert.equals('糧草 300', state.rewardBaseLabel);
    });

    suite.test('委任結果文字：成功與三種拒絕原因都有對應提示', () => {
        assert.equals('已委任，由 AI 選將出戰', hallAssignNoticeOf({ ok: true, record: { taskId: 'x', generalId: 'g', assignedAt: 'T' } }));
        assert.equals('此任務未開放 AI 委任', hallAssignNoticeOf({ ok: false, reason: 'not-enabled' }));
        assert.equals('此任務已在委任中', hallAssignNoticeOf({ ok: false, reason: 'task-already-assigned' }));
        assert.equals('目前沒有可出戰的武將可委任', hallAssignNoticeOf({ ok: false, reason: 'no-candidate' }));
    });

    return suite;
}
