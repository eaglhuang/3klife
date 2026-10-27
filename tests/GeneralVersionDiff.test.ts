/**
 * GeneralVersionDiff.test.ts — 同名版本初始因子對比（SAME-07，PROG-2-1253）headless 測試
 *
 * 鎖住：同因子同等級歸 sameGenes、同因子不同等級歸 changedLevel、只在一邊的歸 onlyIn、
 * 缺欄位或格式錯的因子略過、JSON 整體壞掉回傳 null、沒有因子欄位視為空清單。
 */
import { assert, TestSuite } from './TestRunner';
import { diffVersionGenes } from '../assets/scripts/core/systems/GeneralVersionDiff';
import type { GeneralVersionRecord } from '../assets/scripts/core/models/GeneralVersion';

function versionOf(templateId: string, genes?: unknown): GeneralVersionRecord {
    return {
        Template_ID: templateId,
        Bloodline_ID: 'BL_ZhaoYun',
        Initial_Genes_JSON: genes === undefined ? undefined : JSON.stringify(genes),
    };
}

export function createGeneralVersionDiffSuite(): TestSuite {
    const suite = new TestSuite('GeneralVersionDiff (同名版本因子對比 SAME-07 PROG-2-1253)');

    suite.test('同因子同等級歸 sameGenes，同因子不同等級歸 changedLevel', () => {
        const a = versionOf('Zhao_Yun_V1', [{ Type: 'White', ID: 'W1', Level: 3 }, { Type: 'Red', ID: 'R1', Level: 2 }]);
        const b = versionOf('Zhao_Yun_V3_Holy', [{ Type: 'White', ID: 'W1', Level: 3 }, { Type: 'Red', ID: 'R1', Level: 5 }]);
        const diff = diffVersionGenes(a, b)!;
        assert.equals(1, diff.sameGenes.length);
        assert.equals('W1', diff.sameGenes[0].id);
        assert.equals(1, diff.changedLevel.length);
        assert.equals(2, diff.changedLevel[0].before);
        assert.equals(5, diff.changedLevel[0].after);
    });

    suite.test('只在一邊的因子分到 onlyInA、onlyInB', () => {
        const a = versionOf('Zhao_Yun_V1', [{ Type: 'Blue', ID: 'B1', Level: 1 }]);
        const b = versionOf('Zhao_Yun_V3_Holy', [{ Type: 'Gold', ID: 'G1', Level: 4 }]);
        const diff = diffVersionGenes(a, b)!;
        assert.equals('B1', diff.onlyInA[0].id);
        assert.equals('G1', diff.onlyInB[0].id);
        assert.equals(0, diff.sameGenes.length);
        assert.equals(0, diff.changedLevel.length);
    });

    suite.test('缺欄位或格式錯的因子項目略過', () => {
        const a = versionOf('Zhao_Yun_V1', [
            { Type: 'White', ID: 'W1', Level: 3 },
            { Type: 'White', Level: 2 },
            { Type: 'White', ID: 'W2', Level: 'x' },
            null,
        ]);
        const diff = diffVersionGenes(a, versionOf('Zhao_Yun_V2', []))!;
        assert.equals(1, diff.onlyInA.length);
        assert.equals('W1', diff.onlyInA[0].id);
    });

    suite.test('JSON 整體解析失敗回傳 null；沒有因子欄位視為空清單', () => {
        const broken: GeneralVersionRecord = { Template_ID: 'Zhao_Yun_V1', Bloodline_ID: 'BL_ZhaoYun', Initial_Genes_JSON: '{not json' };
        assert.equals(null, diffVersionGenes(broken, versionOf('Zhao_Yun_V2', [])));

        const none = diffVersionGenes(versionOf('Zhao_Yun_V1'), versionOf('Zhao_Yun_V2'))!;
        assert.equals(0, none.sameGenes.length + none.changedLevel.length + none.onlyInA.length + none.onlyInB.length);
    });

    return suite;
}
