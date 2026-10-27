/**
 * BloodlineStoryDockLayout.test.ts — 命頁故事抽屜三態與版面（GDUI-06，PROG-2-1264）headless 測試
 *
 * 鎖住：手勢一次只跨一態且到頂底夾住；三態高度在規格 8%~22% 範圍內、依序遞增；
 * 三塊版面加總等於命頁總高度、主血統區不為負；格數依序為 1/3/6。
 */
import { assert, TestSuite } from './TestRunner';
import {
    nextStoryDockState,
    STORY_DOCK_HEIGHT_RATIO,
    STORY_DOCK_STATE_ORDER,
    STORY_DOCK_VISIBLE_CELLS,
    storyDockLayout,
} from '../assets/scripts/core/systems/BloodlineStoryDockLayout';

export function createBloodlineStoryDockLayoutSuite(): TestSuite {
    const suite = new TestSuite('BloodlineStoryDockLayout (命頁故事抽屜三態 GDUI-06 PROG-2-1264)');

    suite.test('手勢一次只跨一態，到頂底時夾住', () => {
        assert.equals('HALF', nextStoryDockState('COLLAPSED', 'up'));
        assert.equals('EXPANDED', nextStoryDockState('HALF', 'up'));
        assert.equals('EXPANDED', nextStoryDockState('EXPANDED', 'up'));
        assert.equals('HALF', nextStoryDockState('EXPANDED', 'down'));
        assert.equals('COLLAPSED', nextStoryDockState('COLLAPSED', 'down'));
    });

    suite.test('三態高度在 8%~22% 範圍內且依序遞增', () => {
        const [a, b, c] = STORY_DOCK_STATE_ORDER.map((s) => STORY_DOCK_HEIGHT_RATIO[s]);
        assert.isTrue(a >= 0.08 && c <= 0.22);
        assert.isTrue(a < b && b < c);
    });

    suite.test('版面三塊加總等於總高度，主血統區不為負', () => {
        for (const state of STORY_DOCK_STATE_ORDER) {
            const layout = storyDockLayout(1080, 52, state);
            assert.equals(1080, layout.topBarHeight + layout.stageHeight + layout.dockHeight);
            assert.isTrue(layout.stageHeight >= 0);
        }
        const tiny = storyDockLayout(40, 52, 'EXPANDED');
        assert.equals(40, tiny.topBarHeight + tiny.stageHeight + tiny.dockHeight);
        assert.isTrue(tiny.stageHeight >= 0);
    });

    suite.test('展開時抽屜變高，主血統區相應縮小（reflow）', () => {
        const collapsed = storyDockLayout(1080, 52, 'COLLAPSED');
        const expanded = storyDockLayout(1080, 52, 'EXPANDED');
        assert.isTrue(expanded.dockHeight > collapsed.dockHeight);
        assert.isTrue(expanded.stageHeight < collapsed.stageHeight);
    });

    suite.test('各態格數依序為 1 / 3 / 6', () => {
        assert.equals(1, STORY_DOCK_VISIBLE_CELLS.COLLAPSED);
        assert.equals(3, STORY_DOCK_VISIBLE_CELLS.HALF);
        assert.equals(6, STORY_DOCK_VISIBLE_CELLS.EXPANDED);
    });

    return suite;
}
