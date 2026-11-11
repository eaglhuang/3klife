import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
const layout = (name: string): any => JSON.parse(readFileSync(join(__dirname, '../assets/resources/ui-spec/layouts', name), 'utf8'));
function node(root: any, name: string): any {
    if (root.id === name || root.name === name) return root;
    for (const c of root.children ?? []) { const found = node(c, name); if (found) return found; }
    return null;
}
export function createNewcomerHudLayoutSuite(): TestSuite {
    const suite = new TestSuite('新手側欄與 HUD 分區 PROG-2-2211');
    for (const width of [1280, 1440, 1920]) suite.test(`出征子選單與五分類鈕在 ${width} 寬不溢出且保留間距`, () => {
        const root = layout('lobby-city-hub-main.json').root;
        const menu = node(root, 'subMenu'); const bar = node(root, 'CategoryBar');
        assert.isTrue(menu.widget.hCenter); assert.isTrue(bar.widget.hCenter);
        assert.isTrue(menu.width <= width); assert.isTrue(bar.width <= width);
        assert.isTrue(menu.widget.bottom - (bar.widget.bottom + bar.height) >= 40);
        for (const c of menu.children.filter((x: any) => x.type === 'button')) assert.isTrue(c.widget.left + c.width <= menu.width);
        for (const c of bar.children) assert.isTrue(c.widget.left + c.width <= bar.width);
    });
    suite.test('範例戰報與關雲長側欄不再壓住正式戰報、兵種卡、頂列', () => {
        for (const name of ['battle-hud-screen.json', 'battle-hud-screen.layout.json']) {
            const root = layout(name).root;
            assert.equals(false, node(root, 'BattleHudScreen_aside_1').active);
            assert.equals(false, node(root, 'BattleHudScreen_aside_2').active);
            assert.isTrue(node(root, 'BattleHudScreen_div_1').active !== false);
        }
        const log = layout('battle-log-main.json').root;
        assert.equals(16, log.widget.right); assert.equals(184, log.widget.top); // PROG-2-2225 HUD 五視窗稽核後下移
    });
    return suite;
}
