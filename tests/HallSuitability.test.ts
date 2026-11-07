/**
 * HallSuitability — 人物頁自薦推薦與任務牆跳轉（HUM-07；PROG-2-2074）
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { HALL_DEFAULT_PLAYER, HallBoardPanelController } from '../assets/scripts/ui/core/HallBoardPanelController';
import { loadLobbyHub } from '../assets/scripts/core/systems/HallMissionBoardPresenter';
import { findVolunteerTask, suitabilityBadgeText } from '../assets/scripts/core/systems/HallSuitability';

function hub(): any {
    const loaded = loadLobbyHub(JSON.parse(readFileSync(join(__dirname, '../assets/resources/data/lobby-hub.json'), 'utf8')));
    if (!loaded.ok) throw new Error('lobby-hub.json 驗證失敗');
    return loaded.hub;
}

function controllerWith(mutate: (h: any) => void, assignments: Record<string, string> = {}): HallBoardPanelController {
    const data = hub();
    for (const board of Object.values(data.Mission_Boards) as any[]) {
        for (const task of board.Tasks) {
            task.Volunteer_General_UIDs = [];
            task.Selected_General_UID = null;
        }
    }
    mutate(data);
    return new HallBoardPanelController({
        hub: () => data,
        player: () => HALL_DEFAULT_PLAYER,
        assignments: () => assignments,
        leadGeneralId: () => null,
        assign: async () => true,
        refreshSpots: () => [],
        displayName: (id) => id,
    });
}

const row = (taskId: string, accepted = false) => ({ taskId, title: `T${taskId}`, brief: '', difficultyText: '', requiredRankText: '', rewardText: '', accepted, canAccept: !accepted });
const task = (id: string, volunteers: string[], selected: string | null = null) => ({ Task_ID: id, Volunteer_General_UIDs: volunteers, Selected_General_UID: selected }) as any;

export function createHallSuitabilitySuite(): TestSuite {
    const suite = new TestSuite('HallSuitability (自薦推薦與任務牆跳轉 HUM-07 PROG-2-2074)');

    suite.test('找第一個自薦且未接取、未指定的任務；回傳牆別與列號', () => {
        const boards = [
            { board: 'Military' as const, rows: [row('a', true), row('b')], tasks: [task('a', ['guan-yu']), task('b', ['guan-yu'], 'zhang-fei')] },
            { board: 'Domestic' as const, rows: [row('c'), row('d')], tasks: [task('c', []), task('d', ['guan-yu'])] },
        ];
        const found = findVolunteerTask(boards, 'guan-yu', new Set());
        assert.equals('Domestic:1:d:Td', `${found?.board}:${found?.index}:${found?.taskId}:${found?.taskTitle}`);
        assert.equals(null, findVolunteerTask(boards, 'zhao-yun', new Set()));
    });

    suite.test('已被派去別的任務的武將不顯示自薦', () => {
        const boards = [{ board: 'Military' as const, rows: [row('a')], tasks: [task('a', ['guan-yu'])] }];
        assert.equals(null, findVolunteerTask(boards, 'guan-yu', new Set(['guan-yu'])));
        assert.equals('🔥 自薦推薦：夜襲曹營', suitabilityBadgeText('夜襲曹營'));
    });

    suite.test('任務牆控制器：以可見列定位，指派狀態覆蓋後不再推薦', () => {
        const targetId = controllerWith(() => undefined).rowsFor('Domestic')[0].taskId;
        const mark = (h: any): void => { h.Mission_Boards.Domestic.Tasks.find((t: any) => t.Task_ID === targetId).Volunteer_General_UIDs = ['guan-yu']; };
        const ctrl = controllerWith(mark);
        const found = ctrl.volunteerTaskFor('guan-yu');
        assert.equals('Domestic', found?.board);
        assert.equals(targetId, ctrl.rowsFor('Domestic')[found?.index ?? -1]?.taskId);
        const assigned = controllerWith(mark, { [targetId]: 'zhang-fei' });
        assert.equals(null, assigned.volunteerTaskFor('guan-yu'));
    });

    suite.test('大廳接線：人物頁自薦按鈕跳到任務牆並開任務詳情', () => {
        const lobby = readFileSync(join(__dirname, '../assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(lobby.includes('public openVolunteerTask(generalId: string): boolean'));
        assert.isTrue(lobby.includes('this._openHallBoard(target.board);'));
        assert.isTrue(lobby.includes('this._onClickHallDetail(target.index);'));
        assert.isTrue(lobby.includes('this._bindCharacterDs3Volunteer();'));
    });

    return suite;
}
