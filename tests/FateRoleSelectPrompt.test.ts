// @spec-source → 武將系統.md (doc_spec_0016) §H UI_ROLE_SELECT；PROG-2-1855
import { readFileSync } from 'fs';
import { join } from 'path';
import { TestSuite, assert } from './TestRunner';
import { FATE_TEXT_FALLBACK_ZH_TW, fateText } from '../assets/scripts/ui/core/FateScriptTexts';

function readJson(relative: string): any {
    return JSON.parse(readFileSync(join(__dirname, '..', relative), 'utf8'));
}

function findNode(node: any, id: string): any {
    if (node.id === id) return node;
    for (const child of node.children ?? []) {
        const hit = findNode(child, id);
        if (hit) return hit;
    }
    return null;
}

export function createFateRoleSelectPromptSuite(): TestSuite {
    const suite = new TestSuite('FateRoleSelectPrompt');

    suite.test('預設文案與規格 §H 一字不差，四種語系都有', () => {
        assert.equals('此子年滿五歲，請選擇其天命：', FATE_TEXT_FALLBACK_ZH_TW['ui.fate.role_select']);
        assert.equals('此子年滿五歲，請選擇其天命：', fateText((key) => FATE_TEXT_FALLBACK_ZH_TW[key] ?? key, 'ui.fate.role_select'));
        for (const loc of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const text = readJson(`assets/resources/i18n/${loc}.json`)['ui.fate.role_select'];
            assert.isTrue(typeof text === 'string' && text.length > 0, `${loc} 缺 ui.fate.role_select`);
        }
    });

    suite.test('宿命面板的提示在說明文字下方、選擇鈕上方', () => {
        const layout = readJson('assets/resources/ui-spec/layouts/nurture-flow-main.json');
        const prompt = findNode(layout.root, 'fatePrompt');
        const script = findNode(layout.root, 'fateScript');
        const accept = findNode(layout.root, 'btnFateAccept');
        assert.isTrue(!!prompt, '缺 fatePrompt 節點');
        assert.isTrue(prompt.widget.top >= script.widget.top + script.height);
        assert.isTrue(accept.widget.top >= prompt.widget.top + prompt.height);
    });

    return suite;
}
