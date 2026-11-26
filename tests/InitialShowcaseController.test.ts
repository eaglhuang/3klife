/**
 * InitialShowcaseController.test.ts — 六位初始名將逐一登場（OPEN-06，PROG-2-1365）headless 測試
 *
 * 鎖住：六位同一頁橫排、按一次結束、結束後不再動作；FlowView 文字對應名將資料；
 * 按鈕為「前往宿命轉蛋」（PROG-2-2222、PROG-2-10064）；layout 含所有 FlowView key，skin 含全部 slot。
 *
 * Unity 對照：EditMode Test 依序走訪 Showcase 清單，驗證每一筆的顯示資料與結束條件。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { INITIAL_SHOWCASE_ENTRIES } from '../assets/scripts/core/systems/InitialGeneralShowcase';
import { InitialShowcaseController } from '../assets/scripts/ui/core/InitialShowcaseController';

function readJson<T>(relative: string): T {
    return JSON.parse(readFileSync(join(__dirname, '..', relative), 'utf-8')) as T;
}

function collectIds(node: any, ids: Set<string>): void {
    if (!node || typeof node !== 'object') return;
    if (typeof node.id === 'string') ids.add(node.id);
    for (const child of node.children ?? []) collectIds(child, ids);
}

export function createInitialShowcaseControllerSuite(): TestSuite {
    const suite = new TestSuite('InitialShowcaseController (名將登場 OPEN-06 PROG-2-1365)');

    suite.test('六位名將同一頁，依規格順序橫排；按一次前往宿命轉蛋就結束，之後不再動作（PROG-2-10064）', () => {
        const showcase = new InitialShowcaseController();
        assert.equals(6, showcase.entries.length);
        assert.equals(INITIAL_SHOWCASE_ENTRIES.map(e => e.generalId).join(','), showcase.entries.map(e => e.generalId).join(','));
        assert.isFalse(showcase.finished);
        assert.isTrue(showcase.next());
        assert.isTrue(showcase.finished);
        assert.isFalse(showcase.next());
        assert.equals(0, showcase.entries.length);
    });

    suite.test('FlowView 同時顯示六位名將的名字、稱號、台詞；按鈕直接寫前往宿命轉蛋', () => {
        const view = new InitialShowcaseController().getFlowView();
        INITIAL_SHOWCASE_ENTRIES.forEach((entry, i) => {
            assert.equals(entry.name, view.texts[`showcaseName${i}`]);
            assert.equals(entry.title, view.texts[`showcaseTitle${i}`]);
            assert.equals(`「${entry.formalLine}」`, view.texts[`showcaseLine${i}`]);
        });
        assert.equals('前往宿命轉蛋', view.texts.btnShowcaseNextLabel);
        assert.isTrue(view.enabled.btnShowcaseNext);
        assert.isTrue(view.actives.showcaseCard);
    });

    suite.test('語系字串：標題與按鈕字可由呼叫端覆蓋；趣味版台詞可指定', () => {
        const entries = INITIAL_SHOWCASE_ENTRIES;
        const view = new InitialShowcaseController(entries, { heading: 'H', buttonLabel: 'Go', lineStyle: 'fun' }).getFlowView();
        assert.equals('H', view.texts.showcaseHeading);
        assert.equals('Go', view.texts.btnShowcaseNextLabel);
        assert.equals(`「${entries[0].line}」`, view.texts.showcaseLine0);
    });

    suite.test('結束後卡片隱藏、按鈕停用、文字清空', () => {
        const showcase = new InitialShowcaseController();
        showcase.next();
        const view = showcase.getFlowView();
        assert.isFalse(view.actives.showcaseCard);
        assert.isFalse(view.enabled.btnShowcaseNext);
        assert.equals('', view.texts.showcaseName0);
        assert.equals('', view.texts.btnShowcaseNextLabel);
    });

    suite.test('六欄立繪框在設計解析度內並排放得下，且按鈕錨在卡片底部（不寫死橫式座標）', () => {
        const layout = readJson<any>('assets/resources/ui-spec/layouts/initial-showcase-main.json');
        const card = layout.root.children.find((c: any) => c.id === 'showcaseCard');
        assert.isTrue(card.width <= layout.canvas.designWidth);
        const last = card.children.find((c: any) => c.id === 'showcaseColumn5');
        assert.isTrue(last.widget.left + last.width <= card.width, '第六欄超出卡片');
        assert.isTrue(card.children.length <= 20, '卡片直屬子節點不可超過 20（UI Spec 版面守門）');
        const button = card.children.find((c: any) => c.id === 'btnShowcaseNext');
        assert.isDefined(button.widget.bottom);
    });

    suite.test('initial-showcase layout 含 FlowView 所有 key，skin 含全部 slot，screen 指向正確', () => {
        const layout = readJson<any>('assets/resources/ui-spec/layouts/initial-showcase-main.json');
        const ids = new Set<string>();
        collectIds(layout.root, ids);
        const view = new InitialShowcaseController().getFlowView();
        for (const key of [...Object.keys(view.texts), ...Object.keys(view.actives), ...Object.keys(view.enabled)]) {
            assert.isTrue(ids.has(key), `layout 缺少節點 ${key}`);
        }
        const skin = readJson<any>('assets/resources/ui-spec/skins/initial-showcase-screen.skin.json');
        for (const entry of JSON.stringify(layout).match(/"(?:skinSlot|styleSlot)":\s*"([^"]+)"/g) ?? []) {
            const slot = entry.replace(/.*:\s*"/, '').replace(/"$/, '');
            assert.isDefined(skin.slots[slot], `skin 缺少 ${slot}`);
        }
        const screen = readJson<any>('assets/resources/ui-spec/screens/initial-showcase-screen.json');
        assert.equals('initial-showcase-main', screen.layout);
        assert.equals('initial-showcase-screen.skin', screen.skin);
    });

    return suite;
}
