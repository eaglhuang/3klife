/**
 * LobbyHallThemeNodeView.test.ts — 幕府大廳主題套用的 Cocos 節點實作（UI-2-0148，UI-2-0123 子項）
 */
import { assert, TestSuite } from './TestRunner';
import { Node, Sprite, SpriteFrame, UIOpacity } from 'cc';
import { LobbyHallThemeNodeView, parseHexRgb } from '../assets/scripts/ui/core/LobbyHallThemeNodeView';

function make(name: string, ucufId: string, parent: Node): Node {
    const node = new Node(name);
    (node as unknown as { _ucufId: string })._ucufId = ucufId;
    // 測試用 cc stub 的 parent 只是欄位、沒有 isValid，直接掛進 children 並補上 isValid
    (node as unknown as { isValid: boolean }).isValid = true;
    parent.children.push(node);
    return node;
}

function scene() {
    const root = new Node('LobbyHallScreen');
    const bg = make('div_1', 'lobby-hall-screen.hall-bg', root);
    const night = make('div_2', 'lobby-hall-screen.night-tint', root);
    night.addComponent(Sprite);
    const tint = make('div_53', 'lobby-hall-screen.season-tint', root);
    return { root, bg, night, tint };
}

export function createLobbyHallThemeNodeViewSuite(): TestSuite {
    const suite = new TestSuite('LobbyHallThemeNodeView');

    suite.test('依 id 切換 active；找不到的節點略過不拋錯', () => {
        const { root, night } = scene();
        const view = new LobbyHallThemeNodeView(root, () => undefined);
        view.setActive('lobby-hall-screen.night-tint', false);
        assert.isFalse(night.active, '夜色關閉');
        view.setActive('lobby-hall-screen.festival-slot', true);
        view.setTint('lobby-hall-screen.festival-slot', { color: '#FFFFFF', alpha: 1 });
    });

    suite.test('換圖只採用最後一次請求的結果', () => {
        const { root, bg } = scene();
        const pending: Array<{ path: string; done: (f: SpriteFrame | null) => void }> = [];
        const view = new LobbyHallThemeNodeView(root, (path, done) => { pending.push({ path, done }); });
        view.setSprite('lobby-hall-screen.hall-bg', 'sprites/ui_bg/lobby_hall_spring_bg');
        view.setSprite('lobby-hall-screen.hall-bg', 'sprites/ui_bg/lobby_hall_summer_bg');
        const summer = new SpriteFrame();
        pending[1].done(summer);
        pending[0].done(new SpriteFrame());
        assert.equals(bg.getComponent(Sprite)?.spriteFrame, summer, '保留夏季圖');
    });

    suite.test('有 Sprite 時套顏色與透明度，沒有時只調 UIOpacity', () => {
        const { root, night, tint } = scene();
        const view = new LobbyHallThemeNodeView(root, () => undefined);
        view.setTint('lobby-hall-screen.night-tint', { color: '#0A1028', alpha: 0.55 });
        const c = night.getComponent(Sprite)!.color;
        assert.equals(`${c.r},${c.g},${c.b},${c.a}`, '10,16,40,140', '夜色顏色');
        view.setTint('lobby-hall-screen.season-tint', { color: '#78DC8C', alpha: 0.3 });
        assert.equals(tint.getComponent(UIOpacity)?.opacity, 77, '季節色調透明度');
    });

    suite.test('parseHexRgb 解析 #RRGGBB，格式錯誤回傳 null', () => {
        assert.equals(parseHexRgb('#FFAA50')?.join(','), '255,170,80', '有井號');
        assert.equals(parseHexRgb('0a1028')?.join(','), '10,16,40', '無井號');
        assert.equals(parseHexRgb('#FFF'), null, '三碼不支援');
    });

    return suite;
}
