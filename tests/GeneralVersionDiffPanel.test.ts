/**
 * GeneralVersionDiffPanel.test.ts — 版本圖鑑的版本差異面板（SAME-07 cc 接線，PROG-2-1367）headless 測試
 *
 * 鎖住：比對對象取同血源最早與最新上架；只有一版時不顯示面板；差異摘要的數字；
 * 解析失敗顯示資料異常；戰法與立繪固定顯示「—」；layout 含面板所有 key 且 skin slot 齊全。
 *
 * Unity 對照：EditMode Test 直接餵版本表給 Presenter，檢查 View 綁定用的字串與開關。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    pickComparePair,
    toVersionDiffLayoutState,
    VERSION_DIFF_PLACEHOLDER,
} from '../assets/scripts/core/systems/GeneralVersionDiff';
import { GeneralVersionGalleryController } from '../assets/scripts/ui/core/GeneralVersionGalleryController';
import type { GeneralVersionRecord } from '../assets/scripts/core/models/GeneralVersion';

function readJson<T>(relative: string): T {
    return JSON.parse(readFileSync(join(__dirname, '..', relative), 'utf-8')) as T;
}

function collectIds(node: any, ids: Set<string>): void {
    if (!node || typeof node !== 'object') return;
    if (typeof node.id === 'string') ids.add(node.id);
    for (const child of node.children ?? []) collectIds(child, ids);
}

function versionOf(templateId: string, bloodlineId: string, date: string, genes?: unknown, title?: string): GeneralVersionRecord {
    return {
        Template_ID: templateId,
        Bloodline_ID: bloodlineId,
        Release_Date: date,
        Version_Title: title,
        Initial_Genes_JSON: genes === undefined ? undefined : JSON.stringify(genes),
    };
}

export function createGeneralVersionDiffPanelSuite(): TestSuite {
    const suite = new TestSuite('GeneralVersionDiffPanel (版本差異面板 SAME-07 PROG-2-1367)');

    const bloodline = 'BL_ZhaoYun';
    const v1 = versionOf('Zhao_Yun_V1', bloodline, '2026-01-01', [{ Type: 'White', ID: 'W1', Level: 3 }], '初版');
    const v2 = versionOf('Zhao_Yun_V2', bloodline, '2026-03-01', [{ Type: 'White', ID: 'W1', Level: 4 }], '中版');
    const v3 = versionOf('Zhao_Yun_V3_Holy', bloodline, '2026-06-01', [{ Type: 'White', ID: 'W1', Level: 5 }, { Type: 'Red', ID: 'R1', Level: 1 }], '聖版');
    const solo = versionOf('Lu_Bu_V1', 'BL_LuBu', '2026-02-01', []);

    suite.test('比對對象取同血源最早與最新上架，中間版本不參與', () => {
        const pair = pickComparePair([v3, v1, v2], bloodline)!;
        assert.equals('Zhao_Yun_V1', pair.before.Template_ID);
        assert.equals('Zhao_Yun_V3_Holy', pair.after.Template_ID);
    });

    suite.test('同血源只有一版時沒有比對對象', () => {
        assert.isTrue(pickComparePair([solo], 'BL_LuBu') === null);
        assert.isTrue(pickComparePair([v1, v2], 'BL_NoSuch') === null);
    });

    suite.test('面板摘要：標題帶前後版名稱，因子數字正確', () => {
        const view = toVersionDiffLayoutState(pickComparePair([v1, v2, v3], bloodline));
        assert.isTrue(view.actives.diffPanel);
        assert.equals('版本差異：初版 → 聖版', view.texts.diffTitle);
        assert.equals('因子：相同 0 項・等級變動 1 項・僅前版 0 項・僅後版 1 項', view.texts.diffGenes);
    });

    suite.test('因子 JSON 壞掉時顯示資料異常，不讓面板消失', () => {
        const broken: GeneralVersionRecord = { ...v3, Initial_Genes_JSON: '{not json' };
        const view = toVersionDiffLayoutState({ before: v1, after: broken });
        assert.isTrue(view.actives.diffPanel);
        assert.equals('因子：資料異常', view.texts.diffGenes);
    });

    suite.test('戰法與立繪欄位固定顯示占位符，沒有資料也不報錯', () => {
        const view = toVersionDiffLayoutState(null);
        assert.isFalse(view.actives.diffPanel);
        assert.equals(`戰法：${VERSION_DIFF_PLACEHOLDER}`, view.texts.diffTactics);
        assert.equals(`立繪：${VERSION_DIFF_PLACEHOLDER}`, view.texts.diffPortrait);
    });

    suite.test('圖鑑 Controller：選有兩版的血源顯示面板，選單版血源隱藏面板', () => {
        const controller = new GeneralVersionGalleryController();
        controller.open([v1, v2, v3, solo], new Set());
        // 預設選中第一個血源（BL_LuBu，單版）；切到 BL_ZhaoYun 才會有比對對象
        assert.isFalse(controller.getView().actives.diffPanel);
        controller.selectBloodline(bloodline);
        assert.isTrue(controller.getView().actives.diffPanel);
        controller.selectBloodline('BL_LuBu');
        assert.isFalse(controller.getView().actives.diffPanel);
    });

    suite.test('圖鑑 Controller：有兩版的血源帶同名血脈歸一台詞，單版血源台詞為空', () => {
        const controller = new GeneralVersionGalleryController();
        controller.open([v1, v2, v3, solo], new Set());
        controller.selectBloodline('BL_LuBu');
        assert.equals('', controller.getView().texts.sameNameLore);
        controller.selectBloodline(bloodline);
        const lore = controller.getView().texts.sameNameLore;
        assert.isTrue(lore.startsWith('血脈歸一，'));
        assert.isTrue(lore.endsWith('！'));
    });

    suite.test('gallery layout 含版本差異面板所有 key，skin slot 齊全', () => {
        const layout = readJson<any>('assets/resources/ui-spec/layouts/general-version-gallery-main.json');
        const ids = new Set<string>();
        collectIds(layout.root, ids);
        const view = new GeneralVersionGalleryController();
        view.open([v1, v2, v3], new Set());
        const state = view.getView();
        for (const key of [...Object.keys(state.texts), ...Object.keys(state.actives)]) {
            assert.isTrue(ids.has(key), `layout 缺少節點 ${key}`);
        }
        const screen = readJson<any>('assets/resources/ui-spec/screens/general-version-gallery-screen.json');
        const skin = readJson<any>(`assets/resources/ui-spec/skins/${screen.skin}.json`);
        for (const entry of JSON.stringify(layout).match(/"(?:skinSlot|styleSlot)":\s*"([^"]+)"/g) ?? []) {
            const slot = entry.replace(/.*:\s*"/, '').replace(/"$/, '');
            assert.isDefined(skin.slots[slot], `skin 缺少 ${slot}`);
        }
    });

    return suite;
}
