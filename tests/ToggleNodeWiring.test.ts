/**
 * ToggleNodeWiring.test.ts — 勾選切換節點（toggle）接線守護（PROG-2-0494）
 *
 * AiDelegateToggle 在版面 JSON 的 type、UIPreviewBuilder 的分支、NodeFactory 的 buildToggle、
 * 以及 LobbyMissionDetailDialogComposite 取得 Toggle 元件的程式，四處必須一致。
 * 任一處改名都會讓開關無法取得元件，且執行期才會丟錯。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

const ROOT = path.resolve(__dirname, '..');

function read(relative: string): string {
    return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

export function createToggleNodeWiringSuite(): TestSuite {
    const suite = new TestSuite('ToggleNodeWiring (勾選切換節點接線 PROG-2-0494)');

    suite.test('lobby-mission-detail-dialog 的 AiDelegateToggle 型別為 toggle', () => {
        const layout = read('assets/resources/ui-spec/layouts/lobby-mission-detail-dialog-main.json');
        assert.isTrue(/"type"\s*:\s*"toggle"\s*,\s*"name"\s*:\s*"AiDelegateToggle"/.test(layout), 'AiDelegateToggle 不是 toggle 型別');
    });

    suite.test('UIPreviewBuilder 有 toggle 分支並呼叫 buildToggle', () => {
        const source = read('assets/scripts/ui/core/UIPreviewBuilder.ts');
        assert.isTrue(source.includes("case 'toggle':"), 'UIPreviewBuilder 沒有 toggle 分支');
        assert.isTrue(source.includes('buildToggle(node, spec)'), 'toggle 分支沒有呼叫 buildToggle');
    });

    suite.test('UIPreviewNodeFactory 的 buildToggle 掛 Toggle 元件並共用按鈕外觀流程', () => {
        const source = read('assets/scripts/ui/core/UIPreviewNodeFactory.ts');
        assert.isTrue(source.includes('node.addComponent(Toggle)'), 'buildToggle 沒有掛 Toggle');
        assert.isTrue(source.includes('await this._buildButtonVisuals(node, spec, toggle);'), 'buildToggle 沒有共用按鈕外觀流程');
    });

    suite.test('LobbyMissionDetailDialogComposite 以 Toggle 元件取得並監聽 toggle 事件', () => {
        const source = read('assets/scripts/ui/components/LobbyMissionDetailDialogComposite.ts');
        assert.isTrue(source.includes("getNode('aiDelegateToggle')?.getComponent(Toggle)"), '沒有以 Toggle 元件取得 aiDelegateToggle');
        assert.isTrue(source.includes("node.on('toggle'"), '沒有監聽 toggle 事件');
    });

    return suite;
}
