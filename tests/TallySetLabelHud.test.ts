/**
 * TallySetLabelHud — 戰場 HUD 的玩家 Set 提示標籤（PROG-2-0580）接線守護測試
 *
 * 標籤名稱在版面 JSON、BattleHUDComposite 的綁定、戰場呼叫三處必須一致，任何一處改名都會讓標籤悄悄失效。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

const ROOT = path.resolve(__dirname, '..');
const LABEL = 'PlayerTallySetLabel';

interface LayoutNode {
    name?: string;
    children?: LayoutNode[];
}

function findNode(node: LayoutNode, name: string): LayoutNode | null {
    if (node.name === name) return node;
    for (const child of node.children ?? []) {
        const hit = findNode(child, name);
        if (hit) return hit;
    }
    return null;
}

export function createTallySetLabelHudSuite(): TestSuite {
    const suite = new TestSuite('TallySetLabelHud (戰場 Set 提示標籤 PROG-2-0580)');

    suite.test('版面 JSON 的 TopBar 底下有 PlayerTallySetLabel 標籤', () => {
        const layout = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/layouts/battle-hud-main.json'), 'utf8')) as { root: LayoutNode };
        const topBar = findNode(layout.root, 'TopBar');
        assert.isTrue(topBar !== null, '找不到 TopBar');
        assert.isTrue(findNode(topBar!, LABEL) !== null, 'TopBar 底下沒有 PlayerTallySetLabel');
    });

    suite.test('BattleHUDComposite 用同一個名稱綁定標籤', () => {
        const source = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/components/BattleHUDComposite.ts'), 'utf8');
        assert.isTrue(source.includes(`binder.getLabel('${LABEL}')`), 'BattleHUDComposite 沒有綁定 PlayerTallySetLabel');
    });

    suite.test('戰場每次刷新 HUD 時把在場 Set 文字交給 HUD', () => {
        const source = fs.readFileSync(path.join(ROOT, 'assets/scripts/battle/views/BattleScene.ts'), 'utf8');
        assert.isTrue(source.includes('setPlayerTallySetLabels?.(this.ctrl.activePlayerTallySetLabels)'), 'BattleScene 沒有呼叫 setPlayerTallySetLabels');
    });

    return suite;
}
