import { assert, TestSuite } from './TestRunner';
import {
    UNNAMED_BLOODLINE, UNNAMED_FACTOR, UNNAMED_MERCENARY,
    bloodlineDisplayName, bondingModeChipText, clearBloodlineNames, factorDisplayName, geneColorName,
    isPlaceholderNote, looksLikeInternalId, playerFacingNote, registerBloodlineNames,
} from '../assets/scripts/core/utils/PlayerFacingText';
import { buildMercenaryPoolRows, mercenaryDisplayName } from '../assets/scripts/core/systems/MercenaryPoolPresenter';
import { buildBreedingPreviewLines, tagDisplay } from '../assets/scripts/ui/core/BreedingPreviewPresenter';
import { spiritCodexDetailButtonStates } from '../assets/scripts/ui/core/SpiritCodexController';
import { lobbyClanCardTexts } from '../assets/scripts/ui/core/SpiritFamilyOverviewSummary';
import { buildGeneralDetailOverview } from '../assets/scripts/ui/components/GeneralDetailOverviewMapper';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { EpBreakdown } from '../assets/scripts/core/systems/BreedingSystem';

export function createPlayerFacingTextSuite(): TestSuite {
    const suite = new TestSuite('PlayerFacingText (PROG-2-9159 玩家可見文字清理)');

    suite.test('內部 ID 判斷：ID 為真，中文與一般英文詞為假', () => {
        assert.isTrue(looksLikeInternalId('BL_SHU_YAN'));
        assert.isTrue(looksLikeInternalId('gene_destiny'));
        assert.isTrue(looksLikeInternalId('merc-1794769708887-ma-yun-lu'));
        assert.isTrue(!looksLikeInternalId('天命'));
        assert.isTrue(!looksLikeInternalId('Zhang Fei'));
        assert.isTrue(!looksLikeInternalId(''));
    });

    suite.test('TODO／待校描佔位備註不顯示給玩家', () => {
        const todo = '劉備命紋線索已建檔，仍待正式美術與世界觀校描。';
        assert.isTrue(isPlaceholderNote(todo));
        assert.equals('', playerFacingNote(todo));
        assert.equals('命紋顯現', playerFacingNote('命紋顯現'));
        assert.equals('預設', playerFacingNote(undefined, '預設'));
    });

    suite.test('血脈名：代號齊全用中文；未知代號用持有者姓名，再不行用通用佔位', () => {
        clearBloodlineNames();
        assert.equals('燕血脈', bloodlineDisplayName('BL_SHU_YAN'));
        assert.equals(UNNAMED_BLOODLINE, bloodlineDisplayName('BL_WU_DA_QIAO'));
        registerBloodlineNames([{ name: '大喬', bloodlineId: 'BL_WU_DA_QIAO' }, { name: '別人', bloodlineId: 'BL_WU_DA_QIAO' }]);
        assert.equals('大喬血脈', bloodlineDisplayName('BL_WU_DA_QIAO'));
        assert.equals(UNNAMED_BLOODLINE, bloodlineDisplayName(undefined));
        assert.equals('青龍血脈', bloodlineDisplayName('青龍血脈'));
        clearBloodlineNames();
    });

    suite.test('因子色系與名稱：green → 綠；字典查不到用佔位', () => {
        assert.equals('綠', geneColorName('green'));
        assert.equals('', geneColorName('mystery'));
        assert.equals('藍', geneColorName('藍'));
        assert.equals('天命', factorDisplayName('gene_destiny', () => '天命'));
        assert.equals(UNNAMED_FACTOR, factorDisplayName('gene_destiny', () => undefined));
        assert.equals(UNNAMED_FACTOR, factorDisplayName('gene_destiny', () => 'gene_destiny'));
    });

    suite.test('結緣預覽共鳴標籤不露出 gene_destiny', () => {
        const ep = { ep: 100, rating: '優良', resonance: 0, outcross: 0, affinity: 0, vitalityFull: 0, fate: 0, topTag: 'gene_destiny', topTagCount: 5 } as unknown as EpBreakdown;
        assert.equals(`最多共鳴標籤：${UNNAMED_FACTOR} ×5`, buildBreedingPreviewLines(ep).tagLine);
        assert.equals('最多共鳴標籤：天命 ×5', buildBreedingPreviewLines(ep, () => '天命').tagLine);
        assert.equals('勇', tagDisplay('勇'));
    });

    suite.test('結緣模式列：任一方達親傳上限就不能寫「雙方仍具親傳資格」', () => {
        assert.equals('模式：一般結緣 · 雙方仍具親傳資格', bondingModeChipText(false, []));
        assert.isTrue(!bondingModeChipText(false, ['mother-breeding-cap']).includes('仍具親傳資格'));
        assert.isTrue(bondingModeChipText(false, ['mother-breeding-cap']).includes('母方已達一生親傳上限'));
        assert.isTrue(bondingModeChipText(true, ['father-breeding-cap', 'mother-breeding-cap']).includes('雙方已達一生親傳上限'));
        assert.isTrue(bondingModeChipText(true, []).includes('和平血統線'));
    });

    suite.test('傭兵池列：顯示武將名，查不到時用佔位而不是 uid', () => {
        const uid = 'merc-1794769708887-ma-yun-lu';
        assert.equals('馬雲祿', mercenaryDisplayName('ma-yun-lu', uid, () => '馬雲祿'));
        assert.equals(UNNAMED_MERCENARY, mercenaryDisplayName('ma-yun-lu', uid, () => undefined));
        assert.equals(UNNAMED_MERCENARY, mercenaryDisplayName(undefined, uid));
        const rows = buildMercenaryPoolRows({ mercenaries: [{ uid, daysLeft: 3, bond: 0, status: 'Trial', generalId: 'ma-yun-lu' }], upkeep: [], cooldowns: [] }, () => '馬雲祿');
        assert.equals('馬雲祿', rows[0].displayName);
    });

    suite.test('英靈圖鑑：0 位時 6 顆詳情鈕全隱藏，2 位時只顯示前 2 顆', () => {
        const none = spiritCodexDetailButtonStates(0);
        assert.isTrue(Object.values(none.actives).every((v) => v === false));
        assert.equals(6, Object.keys(none.actives).length);
        const two = spiritCodexDetailButtonStates(2);
        assert.isTrue(two.actives.btnSpiritDetail1 === true && two.actives.btnSpiritDetail2 === false);
    });

    suite.test('大廳世家卡：沒有英靈世家時不顯示示意名聲數字', () => {
        const empty = lobbyClanCardTexts([]);
        assert.equals('管理麾下世家與英靈 · 已成家族 0', empty.subtitle);
        assert.isTrue(!/\d{3}/.test(empty.line));
        const one = lobbyClanCardTexts([{ familyKey: 'k', familyName: '張氏', mainName: '張飛', destinyCount: 1, relicCount: 2 }]);
        assert.equals('張氏｜主卡：張飛｜命槽 1・陳列 2', one.line);
    });

    suite.test('武將詳情：沒有稱號不借用燕人猛將，命紋 TODO 備註改用通用句，血脈不露 ID', () => {
        const cfg = { id: 'peng-yang-nv', name: '彭羕之女', bloodlineId: 'BL_WU_DA_QIAO', crestHint: '大喬命紋線索已建檔，仍待正式美術與世界觀校描。' } as unknown as GeneralConfig;
        const overview = buildGeneralDetailOverview(cfg);
        assert.equals('', overview.header.title);
        assert.equals('彭羕之女', overview.header.name);
        assert.isTrue(!overview.cards.crestHint.includes('仍待'));
        assert.isTrue(!/BL_|[A-Z]{2}/.test(overview.cards.bloodlineName));
    });

    return suite;
}
