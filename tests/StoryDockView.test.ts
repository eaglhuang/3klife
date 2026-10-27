/**
 * StoryDockView.test.ts — 命頁 StoryDock 三態（GDUI-06，PROG-2-1046）
 *
 * 鎖住：三態顯示格數 1／3／5；故事條依固定節奏取格，不足補空字串；
 * 展開時血統區縮小且總高度守恆（不 overlay）；把手拖拉一階並在兩端停住。
 */
import { assert, TestSuite } from './TestRunner';
import {
    nextStoryDockState,
    STORY_DOCK_HEIGHT,
    STORY_DOCK_VISIBLE_CELLS,
    STORY_STRIP_RHYTHM,
    storyDockCells,
    storyDockLayout,
} from '../assets/scripts/core/systems/StoryDockView';

export function createStoryDockViewSuite(): TestSuite {
    const suite = new TestSuite('StoryDockView (命頁故事條三態 GDUI-06)');

    suite.test('三態顯示格數為 1／3／5，展開為完整五段節奏', () => {
        assert.equals(1, STORY_DOCK_VISIBLE_CELLS.COLLAPSED);
        assert.equals(3, STORY_DOCK_VISIBLE_CELLS.HALF);
        assert.equals(5, STORY_DOCK_VISIBLE_CELLS.EXPANDED);
        assert.equals(STORY_STRIP_RHYTHM.length, STORY_DOCK_VISIBLE_CELLS.EXPANDED);
    });

    suite.test('故事條節奏固定為歷史人生、命運轉折、血脈暗示、祖靈牽引、未來伏筆', () => {
        assert.equals('歷史人生', STORY_STRIP_RHYTHM[0]);
        assert.equals('未來伏筆', STORY_STRIP_RHYTHM[4]);
        assert.equals(5, STORY_STRIP_RHYTHM.length);
    });

    suite.test('依態取故事格，文字不足時補空字串而不補假故事', () => {
        const stories = ['甲', '乙'];
        const collapsed = storyDockCells(stories, 'COLLAPSED');
        assert.equals(1, collapsed.length);
        assert.equals('甲', collapsed[0].text);
        const expanded = storyDockCells(stories, 'EXPANDED');
        assert.equals(5, expanded.length);
        assert.equals('乙', expanded[1].text);
        assert.equals('', expanded[2].text);
        assert.equals('未來伏筆', expanded[4].label);
    });

    suite.test('展開時血統區縮小，總高度守恆（不 overlay）', () => {
        const total = 900;
        for (const state of ['COLLAPSED', 'HALF', 'EXPANDED'] as const) {
            const layout = storyDockLayout(state, total);
            assert.equals(total, layout.bloodlineHeight + layout.dockHeight);
            assert.equals(STORY_DOCK_HEIGHT[state], layout.dockHeight);
        }
        assert.isTrue(storyDockLayout('EXPANDED', total).bloodlineHeight < storyDockLayout('COLLAPSED', total).bloodlineHeight);
    });

    suite.test('總高度不足時故事條不超過總高度，血統區不為負', () => {
        const layout = storyDockLayout('EXPANDED', 100);
        assert.equals(100, layout.dockHeight);
        assert.equals(0, layout.bloodlineHeight);
    });

    suite.test('把手向上拖展開一階、向下拖收合一階，兩端停住', () => {
        assert.equals('HALF', nextStoryDockState('COLLAPSED', 'UP'));
        assert.equals('EXPANDED', nextStoryDockState('HALF', 'UP'));
        assert.equals('EXPANDED', nextStoryDockState('EXPANDED', 'UP'));
        assert.equals('HALF', nextStoryDockState('EXPANDED', 'DOWN'));
        assert.equals('COLLAPSED', nextStoryDockState('COLLAPSED', 'DOWN'));
    });

    return suite;
}
