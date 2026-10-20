/**
 * BloodlineMerge — 同名武將血脈歸宗（SAME-09 / PROG-2-0858）
 *
 * 驗證重點：
 *   1. 成功：V1 多一個因子並扣 1 張歸宗令；V2 保留該因子並標記已歸宗
 *   2. 拒絕：同版本、跨血源、無歸宗令、因子不存在、已歸宗、V1 已持有，且輸入不被改動
 */
import { assert, TestSuite } from './TestRunner';
import {
    BloodlineMergeResult,
    mergeBloodlineGene,
    MergeGeneral,
    MergeSourceGeneral,
} from '../assets/scripts/core/models/SameBloodlineMerge';

function v1(overrides: Partial<MergeGeneral> = {}): MergeGeneral {
    return { templateId: 'TPL_ZY_A', bloodlineId: 'BL_ZhaoYun', genes: ['G_RED'], mergeTokens: 1, ...overrides };
}

function v2(overrides: Partial<MergeSourceGeneral> = {}): MergeSourceGeneral {
    return {
        templateId: 'TPL_ZY_B',
        bloodlineId: 'BL_ZhaoYun',
        genes: [{ id: 'G_WHITE' }, { id: 'G_PINK', merged: true }],
        ...overrides,
    };
}

function reasonOf(result: BloodlineMergeResult): string {
    return result.ok ? 'OK' : result.reason;
}

export function createSameBloodlineMergeSuite(): TestSuite {
    const suite = new TestSuite('SameBloodlineMerge (血脈歸宗 SAME-09)');

    suite.test('成功：V1 獲得因子並扣一張歸宗令；V2 保留該因子並標記已歸宗', () => {
        const result = mergeBloodlineGene(v1(), v2(), 'G_WHITE');
        assert.isTrue(result.ok);
        if (result.ok) {
            assert.isTrue(result.v1.genes.includes('G_WHITE'));
            assert.equals(0, result.v1.mergeTokens);
            const transferred = result.v2.genes.find((gene) => gene.id === 'G_WHITE');
            assert.equals(true, transferred?.merged);
        }
    });

    suite.test('同版本或跨血源都拒絕', () => {
        assert.equals('SAME_TEMPLATE', reasonOf(mergeBloodlineGene(v1(), v2({ templateId: 'TPL_ZY_A' }), 'G_WHITE')));
        assert.equals('BLOODLINE_MISMATCH', reasonOf(mergeBloodlineGene(v1(), v2({ bloodlineId: 'BL_LvBu' }), 'G_WHITE')));
    });

    suite.test('無歸宗令、因子不存在、已歸宗、V1 已持有都拒絕', () => {
        assert.equals('NO_TOKEN', reasonOf(mergeBloodlineGene(v1({ mergeTokens: 0 }), v2(), 'G_WHITE')));
        assert.equals('GENE_NOT_FOUND', reasonOf(mergeBloodlineGene(v1(), v2(), 'G_NONE')));
        assert.equals('GENE_ALREADY_MERGED', reasonOf(mergeBloodlineGene(v1(), v2(), 'G_PINK')));
        assert.equals('GENE_ALREADY_OWNED', reasonOf(mergeBloodlineGene(v1({ genes: ['G_WHITE'] }), v2(), 'G_WHITE')));
    });

    suite.test('拒絕時輸入不被改動', () => {
        const source = v1();
        const donor = v2();
        mergeBloodlineGene(source, donor, 'G_PINK');
        assert.equals(1, source.mergeTokens);
        assert.equals(false, donor.genes.some((gene) => gene.id === 'G_WHITE' && gene.merged === true));
    });

    return suite;
}
