/**
 * LobbyHallWallView.test.ts — 任務板列資料轉幕府大廳牆面顯示（UI-2-0153）
 */
import { assert, TestSuite } from './TestRunner';
import type { HallTaskRow } from '../assets/scripts/core/systems/HallMissionBoardPresenter';
import { buildLobbyHallWallView, LOBBY_HALL_WALL_ROWS } from '../assets/scripts/core/systems/LobbyHallWallView';

function row(id: string, over: Partial<HallTaskRow> = {}): HallTaskRow {
    return {
        taskId: id, title: `任務${id}`, brief: '', difficultyText: '中',
        requiredRankText: '官階 2 以上', rewardText: '金錢 +100',
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
        assert.equals(view.rows[0].meta, '金錢 +100');
        assert.isTrue(view.rows[0].pinned);
        assert.equals(view.rows[1].meta, '官階 2 以上');
        assert.isTrue(!view.rows[1].pinned);
    });

    suite.test('沒有任務時計數為 0，無列', () => {
        const view = buildLobbyHallWallView([], 8);
        assert.equals(view.countText, '0 / 8');
        assert.equals(view.rows.length, 0);
    });

    return suite;
}
