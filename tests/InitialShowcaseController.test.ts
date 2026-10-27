/**
 * InitialShowcaseController.test.ts — 六位初始名將逐一登場（OPEN-06，PROG-2-1365）headless 測試
 *
 * 鎖住：依規格順序翻六位、最後一位回傳 true、結束後不再動作；FlowView 文字對應名將資料；
 * 最後一位按鈕改為「開始冒險」；layout 含所有 FlowView key，skin 含全部 slot。
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

    suite.test('依規格順序逐位翻，翻完最後一位回傳 true，之後不再動作', () => {
        const intro = new InitialShowcaseController();
        for (let i = 0; i < INITIAL_SHOWCASE_ENTRIES.length - 1; i++) {
            assert.isFalse(intro.next());
            assert.equals(INITIAL_SHOWCASE_ENTRIES[i + 1].generalId, intro.current!.generalId);
        }
        assert.isTrue(intro.next());
        assert.isTrue(intro.finished);
        assert.isFalse(intro.next());
        assert.isTrue(intro.current === null);
    });

    suite.test('FlowView 顯示目前名將的名字、稱號、台詞與因子標籤', () => {
        const view = new InitialShowcaseController().getFlowView();
        const first = INITIAL_SHOWCASE_ENTRIES[0];
        assert.equals(first.name, view.texts.showcaseName);
        assert.equals(first.title, view.texts.showcaseTitle);
        assert.equals(`「${first.line}」`, view.texts.showcaseLine);
        assert.equals(first.factorTags.join('・'), view.texts.showcaseFactors);
        assert.equals(`1 / ${INITIAL_SHOWCASE_ENTRIES.length}`, view.texts.showcaseStep);
        assert.equals('下一位', view.texts.btnShowcaseNextLabel);
        assert.isTrue(view.enabled.btnShowcaseNext);
    });

    suite.test('最後一位按鈕改為開始冒險', () => {
        const intro = new InitialShowcaseController();
        for (let i = 0; i < INITIAL_SHOWCASE_ENTRIES.length - 1; i++) intro.next();
        assert.equals('開始冒險', intro.getFlowView().texts.btnShowcaseNextLabel);
    });

    suite.test('全部看完後卡片隱藏、按鈕停用', () => {
        const intro = new InitialShowcaseController();
        for (let i = 0; i < INITIAL_SHOWCASE_ENTRIES.length; i++) intro.next();
        const view = intro.getFlowView();
        assert.isFalse(view.actives.showcaseCard);
        assert.isFalse(view.enabled.btnShowcaseNext);
        assert.equals('', view.texts.showcaseName);
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
