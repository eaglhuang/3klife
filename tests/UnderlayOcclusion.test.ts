/**
 * UnderlayOcclusion.test.ts — 全螢幕畫面打開時停用底層畫面（PROG-2-9802）
 */
import { OCCLUSION_KEEP_NAMES, UnderlayOcclusionState, pickOccludable, type OcclusionTarget } from '../assets/scripts/ui/core/UnderlayOcclusion';
import { resolveScreenBackdrop } from '../assets/scripts/ui/core/ScreenBackdrop';
import { TestSuite, assert } from './TestRunner';

const node = (name: string, active = true): OcclusionTarget & { isValid?: boolean } => ({ name, active, isValid: true });

export function createUnderlayOcclusionSuite(): TestSuite {
    const suite = new TestSuite('UnderlayOcclusion (全螢幕畫面遮蔽底層 PROG-2-9802)');

    suite.test('只挑蓋板之下、啟用中、非共用底層的兄弟', () => {
        const list = [node('Camera'), node('Background'), node('LobbyMainHost'), node('CityHubHost', false), node('LobbyHallHost'), node('Cover'), node('Popup')];
        const picked = pickOccludable(list, 5, n => n.name === 'Camera');
        assert.equals(picked.map(n => n.name).join(','), 'LobbyMainHost,LobbyHallHost', '略過攝影機、背景、未啟用者與蓋板之上的節點');
        assert.isTrue(OCCLUSION_KEEP_NAMES.includes('__ui-backdrop'), '彈窗遮罩屬共用底層');
    });

    suite.test('hide 停用、restore 還原；重複 hide 不重複記錄', () => {
        const a = node('A'); const b = node('B');
        const state = new UnderlayOcclusionState();
        state.hide([a, b]);
        assert.equals(a.active, false); assert.equals(b.active, false);
        state.hide([a, b]);
        assert.equals(state.hiddenCount, 2, '不重複記錄');
        state.restore();
        assert.equals(a.active, true); assert.equals(b.active, true);
        assert.equals(state.hiddenCount, 0);
    });

    suite.test('restore 不動已銷毀的節點；沒被我們停用的不會被啟用', () => {
        const gone = node('Gone'); const other = node('Other', false);
        const state = new UnderlayOcclusionState();
        state.hide([gone]);
        (gone as { isValid?: boolean }).isValid = false;
        state.restore();
        assert.equals(gone.active, false, '已銷毀的不碰');
        assert.equals(other.active, false, '從未被記錄的節點維持原狀');
    });

    suite.test('沒有可遮蔽的節點時 hide 空陣列不出錯', () => {
        const state = new UnderlayOcclusionState();
        state.hide([]);
        state.restore();
        assert.equals(state.hiddenCount, 0);
    });

    suite.test('背景圖表：occludeUnderlay 預設 true，可設 false 關閉', () => {
        const table = {
            screens: { a: 'x', b: 'y' },
            backdrops: { x: { sprite: 'p/x' }, y: { sprite: 'p/y', occludeUnderlay: false } },
        };
        assert.equals(resolveScreenBackdrop(table, 'a')?.occludeUnderlay, true);
        assert.equals(resolveScreenBackdrop(table, 'b')?.occludeUnderlay, false);
    });

    return suite;
}
