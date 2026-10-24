/**
 * PROG-2-1083：戰鬥 HUD 必須鋪滿全螢幕，從 HTML 轉來的面板不可蓋住戰場。
 * - BattleScene.scene 的 Canvas/HUD 原本只有 1920x100、貼在頂端，HUD 畫面被壓進這條帶子裡排版，
 *   貼底的指令列跑到上方、貼頂的面板往下溢出。
 * - battle-hud-screen 的 div_13 是 HTML 原型畫的棋盤，與 3D 棋盤重複，執行期被拉成整條色帶。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

const ROOT = path.resolve(__dirname, '..');

interface LayoutNode { name: string; active?: boolean; widget?: Record<string, number | boolean>; children?: LayoutNode[] }

function bodyChild(name: string): LayoutNode {
    const json = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/layouts/battle-hud-screen.json'), 'utf8'));
    const body: LayoutNode = json.root.children[0];
    const node = (body.children ?? []).find((c) => c.name === `BattleHudScreen_${name}`);
    if (!node) throw new Error(`battle-hud-screen 缺少 ${name}`);
    return node;
}

export function createBattleHudScreenAnchorsSuite(): TestSuite {
    const suite = new TestSuite('BattleHudScreenAnchors');

    suite.test('Canvas/HUD 鋪滿 1920x1080 並置中', () => {
        const scene = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/scenes/BattleScene.scene'), 'utf8')) as Array<Record<string, any>>;
        const hud = scene.find((o) => o.__type__ === 'cc.Node' && o._name === 'HUD');
        assert.isTrue(!!hud, '找不到 HUD 節點');
        assert.equals(0, hud!._lpos.y);
        const ut = (hud!._components as Array<{ __id__: number }>).map((c) => scene[c.__id__]).find((c) => c.__type__ === 'cc.UITransform');
        assert.equals(1920, ut._contentSize.width);
        assert.equals(1080, ut._contentSize.height);
    });

    suite.test('模擬棋盤 div_13 不顯示', () => {
        assert.isFalse(bodyChild('div_13').active !== false, 'div_13 應設 active: false');
    });

    suite.test('側欄、指令列與按鈕只錨兩邊、沒有負值錨點', () => {
        for (const name of ['aside_1', 'aside_2', 'button_1', 'div_122']) {
            const w = bodyChild(name).widget ?? {};
            const sides = ['top', 'bottom', 'left', 'right'].filter((k) => typeof w[k] === 'number');
            assert.isTrue(sides.length <= 2, `${name} 四邊錨點過多：${sides.join(',')}`);
            for (const k of sides) assert.isTrue((w[k] as number) >= 0, `${name}.${k} 為負值`);
        }
    });

    return suite;
}
