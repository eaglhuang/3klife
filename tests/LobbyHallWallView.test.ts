/**
 * LobbyHallWallView.test.ts — 任務板列資料轉幕府大廳牆面顯示（UI-2-0153）
 */
import { assert, TestSuite } from './TestRunner';
import type { HallTaskRow } from '../assets/scripts/core/systems/HallMissionBoardPresenter';
import { buildLobbyHallWallView, LOBBY_HALL_WALL_ROWS } from '../assets/scripts/core/systems/LobbyHallWallView';

function row(id: string, over: Partial<HallTaskRow> = {}): HallTaskRow {
    return {
        taskId: id, title: `任務${id}`, brief: '', difficultyText: '中',
        requiredRankText: '官階 2 以上', rewardText: '黃金 +100',
        accepted: false, canAccept: true, ...over,
    };
}

export function createLobbyHallWallViewSuite(): TestSuite {
    const suite = new TestSuite('LobbyHallWallView');

    suite.test('計數用全部列數，牆面只取前 4 列', () => {
        const view = buildLobbyHallWallView(['1', '2', '3', '4', '5', '6'].map(id => row(id)), 8);
        assert.equals(view.countText, '6 / 8');
        assert.equals(view.rows.length, LOBBY_HALL_WALL_ROWS);
        assert.equals(view.rows[0].title, '任務1');
        assert.equals(view.rows[0].difficulty, '中');
    });

    suite.test('沒有獎勵時改顯示官階需求；已接取標成置頂', () => {
        const view = buildLobbyHallWallView([row('1', { accepted: true }), row('2', { rewardText: '' })], 8);
        assert.equals(view.rows[0].meta, '黃金 +100');
        assert.isTrue(view.rows[0].pinned);
        assert.equals(view.rows[1].meta, '官階 2 以上');
        assert.isTrue(!view.rows[1].pinned);
    });

    suite.test('任務卡有獎勵提示就優先顯示（新手牆上要看得到好處），沒有才退回獎勵字／官階', () => {
        const hints: Record<string, string> = { '1': '糧草／武將經驗？', '2': '' };
        const view = buildLobbyHallWallView([row('1'), row('2', { rewardText: '' }), row('3', { rewardText: '' })], 8, undefined, (r) => hints[r.taskId] ?? '');
        assert.equals(view.rows[0].meta, '糧草／武將經驗？');
        assert.equals(view.rows[1].meta, '官階 2 以上');
        assert.equals(view.rows[2].meta, '官階 2 以上');
    });

    suite.test('沒有任務時計數為 0，無列', () => {
        const view = buildLobbyHallWallView([], 8);
        assert.equals(view.countText, '0 / 8');
        assert.equals(view.rows.length, 0);
    });

    return suite;
}
