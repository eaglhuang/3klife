import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

const { computeSubMenuLayout, SUB_MENU_BTN_W } = require('../assets/scripts/ui/core/LobbyCityHubController');

export function createLobbySubMenuLayoutSuite(): TestSuite {
    const suite = new TestSuite('LobbySubMenuLayout');

    suite.test('可見 1～5 個按鈕：全在面板內、左右邊距對稱、間距一致', () => {
        for (let n = 1; n <= 5; n++) {
            const layout = computeSubMenuLayout(n);
            assert.equals(n, layout.buttonLefts.length);
            const leftMargin = layout.buttonLefts[0];
            const rightMargin = layout.width - (layout.buttonLefts[n - 1] + SUB_MENU_BTN_W);
            assert.isTrue(Math.abs(leftMargin - rightMargin) <= 1, `n=${n} 左右邊距不對稱 ${leftMargin}/${rightMargin}`);
            assert.isTrue(leftMargin >= 0 && rightMargin >= 0, `n=${n} 按鈕超出面板`);
            for (let i = 1; i < n; i++) {
                assert.equals(12, layout.buttonLefts[i] - layout.buttonLefts[i - 1] - SUB_MENU_BTN_W, `n=${n} 間距不一致`);
            }
            // 標題左右各留 titleInset，不超出面板
            assert.isTrue(layout.titleInset * 2 < layout.width);
        }
    });

    suite.test('隱藏按鈕不佔位：0 個回傳空陣列', () => {
        assert.equals(0, computeSubMenuLayout(0).buttonLefts.length);
    });

    suite.test('版面檔 BtnSub0..4 的 Widget.left 與 computeSubMenuLayout(5) 一致', () => {
        const file = path.join(__dirname, '../assets/resources/ui-spec/layouts/lobby-city-hub-main.json');
        const json = JSON.parse(fs.readFileSync(file, 'utf8'));
        const find = (n: any, id: string): any => {
            if (n && n.id === id) return n;
            for (const c of (n && n.children) || []) { const r = find(c, id); if (r) return r; }
            return null;
        };
        const root = json.root ?? json;
        const lefts = computeSubMenuLayout(5).buttonLefts;
        for (let i = 0; i < 5; i++) {
            assert.equals(lefts[i], find(root, `btnSub${i}`).widget.left, `btnSub${i}`);
        }
        const title = find(root, 'subMenuTitle').widget;
        assert.equals(computeSubMenuLayout(5).titleInset, title.left);
        assert.equals(computeSubMenuLayout(5).titleInset, title.right);
    });

    suite.test('LobbyScene 只在數量或節點變動時套用版面，並遞迴重新對齊 Widget', () => {
        const src = fs.readFileSync(path.join(__dirname, '../assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(src.includes('applySubMenuLayout(subMenuNode, layout)'));
        assert.isTrue(src.includes('_cityHubSubMenuAppliedCount !== view.visibleSubCount'));
        assert.isTrue(src.includes('realign(child)'));
    });

    return suite;
}
