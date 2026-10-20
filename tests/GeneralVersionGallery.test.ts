/**
 * GeneralVersionGallery.test.ts — 同名武將版本圖鑑（SAME-01 項 5 / PROG-2-0707）headless 測試
 *
 * Unity 對照：像 EditMode 測試，逐條驗 ViewModel 的分組、進度文字與排序。
 */
import { assert, TestSuite } from './TestRunner';
import { buildVersionGallery, findGalleryGroup, galleryTotals, toGalleryLayoutState } from '../assets/scripts/core/systems/GeneralVersionGallery';
import type { GeneralVersionRecord } from '../assets/scripts/core/models/GeneralVersion';

const TABLE: GeneralVersionRecord[] = [
    { Template_ID: 'Zhao_Yun_V3_Holy', Bloodline_ID: 'BL_ZhaoYun', Display_Name: '神聖趙雲', Version_Title: '聖光降臨', Release_Date: '2026-06-01', Is_Limited: true },
    { Template_ID: 'Zhao_Yun_V1', Bloodline_ID: 'BL_ZhaoYun', Display_Name: '趙雲', Version_Title: '常山之龍', Release_Date: '2026-01-01' },
    { Template_ID: 'Lu_Bu_V1', Bloodline_ID: 'BL_LuBu', Display_Name: '呂布', Release_Date: '2026-02-01' },
];

export function createGeneralVersionGallerySuite(): TestSuite {
    const suite = new TestSuite('GeneralVersionGallery (同名武將版本圖鑑 PROG-2-0707)');

    suite.test('依血源分組，血源依 Bloodline_ID 排序，版本依上架日排序', () => {
        const groups = buildVersionGallery(TABLE, new Set());
        assert.equals(JSON.stringify(['BL_LuBu', 'BL_ZhaoYun']), JSON.stringify(groups.map((g) => g.bloodlineId)));
        const zhao = findGalleryGroup(groups, 'BL_ZhaoYun')!;
        assert.equals(JSON.stringify(['Zhao_Yun_V1', 'Zhao_Yun_V3_Holy']), JSON.stringify(zhao.entries.map((e) => e.templateId)));
    });

    suite.test('進度：擁有 1/2 顯示「收集 1/2」，未完成不標 complete', () => {
        const zhao = findGalleryGroup(buildVersionGallery(TABLE, new Set(['Zhao_Yun_V1'])), 'BL_ZhaoYun')!;
        assert.equals(1, zhao.ownedCount);
        assert.equals(2, zhao.totalCount);
        assert.equals('收集 1/2', zhao.progressText);
        assert.isFalse(zhao.complete);
    });

    suite.test('全部收齊顯示「已收集完成」；只擁有不在表內的 Template_ID 不計入', () => {
        const zhao = findGalleryGroup(buildVersionGallery(TABLE, new Set(['Zhao_Yun_V1', 'Zhao_Yun_V3_Holy', 'GHOST_V1'])), 'BL_ZhaoYun')!;
        assert.equals('已收集完成', zhao.progressText);
        assert.isTrue(zhao.complete);
        assert.equals(2, zhao.ownedCount);
    });

    suite.test('格子資訊：限定旗標、擁有狀態、缺欄位退回預設', () => {
        const zhao = findGalleryGroup(buildVersionGallery(TABLE, new Set(['Zhao_Yun_V3_Holy'])), 'BL_ZhaoYun')!;
        const holy = zhao.entries[1];
        assert.isTrue(holy.owned);
        assert.isTrue(holy.isLimited);
        assert.isFalse(zhao.entries[0].owned);
        assert.isFalse(zhao.entries[0].isLimited);
        const lu = findGalleryGroup(buildVersionGallery(TABLE, new Set()), 'BL_LuBu')!;
        assert.equals('', lu.entries[0].versionTitle);
        assert.equals('BL_LuBu', lu.bloodlineId);
        assert.equals('呂布', lu.displayName);
    });

    suite.test('總進度：跨血源加總；找不到血源回傳 null', () => {
        const groups = buildVersionGallery(TABLE, new Set(['Lu_Bu_V1', 'Zhao_Yun_V1']));
        const totals = galleryTotals(groups);
        assert.equals(2, totals.ownedCount);
        assert.equals(3, totals.totalCount);
        assert.equals(null, findGalleryGroup(groups, 'BL_NOPE'));
    });

    return suite;
}

export function createGeneralVersionGalleryLayoutSuite(): TestSuite {
    const suite = new TestSuite('GeneralVersionGallery 版面狀態 (PROG-2-0708)');
    suite.test('左欄列血源與進度；選中血源時右欄列版本格與狀態', () => {
        const groups = buildVersionGallery(TABLE, new Set(['Zhao_Yun_V1']));
        const state = toGalleryLayoutState(groups, 'BL_ZhaoYun');
        assert.equals('收集 1/2', state.texts.groupProgress_1);
        assert.isTrue(state.actives.groupSelected_1);
        assert.equals('趙雲', state.texts.groupName_1);
        assert.equals('已擁有', state.texts.cellState_0);
        assert.equals('未收集', state.texts.cellState_1);
        assert.isTrue(state.actives.cellLimited_1);
        assert.isFalse(state.actives.cell_2);
    });
    suite.test('沒有選中或槽位不足時不顯示多餘列', () => {
        const groups = buildVersionGallery(TABLE, new Set());
        const state = toGalleryLayoutState(groups, null);
        assert.equals('', state.texts.selectedName);
        assert.isFalse(state.actives.cell_0);
        assert.isFalse(state.actives.groupRow_5);
        assert.isTrue(state.actives.groupRow_1);
    });
    return suite;
}
