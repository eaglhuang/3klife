/**
 * TeachingSpiritTalisman.test.ts — 英靈夢回教學戰的初始虎符（PROG-2-1203，OPEN-13）
 */
import { assert, TestSuite } from './TestRunner';
import {
    buildStartingSpiritTalisman,
    normalizeStartingTalisman,
    TEACHING_STARTING_GENE_LIMIT,
    type TeachingSpiritInput,
} from '../assets/scripts/core/systems/TeachingSpiritTalisman';

function spirit(geneIds: string[] = ['GENE_A', 'GENE_B', 'GENE_C']): TeachingSpiritInput {
    return { spiritId: 'SPIRIT_ZHAOYUN', spiritName: '趙雲', geneIds };
}

export function createTeachingSpiritTalismanSuite(): TestSuite {
    const suite = new TestSuite('TeachingSpiritTalisman (PROG-2-1203 英靈夢回虎符)');

    suite.test('教學戰未完成時不產生虎符，玩家可以重打', () => {
        assert.isTrue(buildStartingSpiritTalisman(spirit(), false) === null);
    });

    suite.test('教學戰完成後英靈轉為初始虎符，來源與名稱保留', () => {
        const talisman = buildStartingSpiritTalisman(spirit(), true)!;
        assert.equals('TALISMAN', talisman.kind);
        assert.equals('SPIRIT_ZHAOYUN', talisman.sourceSpiritId);
        assert.equals('趙雲', talisman.sourceName);
    });

    suite.test('基因只保留少量（上限內），依原順序取前幾個', () => {
        const talisman = buildStartingSpiritTalisman(spirit(), true)!;
        assert.equals(TEACHING_STARTING_GENE_LIMIT, talisman.geneIds.length);
        assert.equals('GENE_A,GENE_B', talisman.geneIds.join(','));
    });

    suite.test('重複基因去重後再套用上限', () => {
        const talisman = buildStartingSpiritTalisman(spirit(['GENE_A', 'GENE_A', 'GENE_B']), true)!;
        assert.equals('GENE_A,GENE_B', talisman.geneIds.join(','));
    });

    suite.test('英靈不進名冊：輸出不含武將 uid 欄位，輸入也不被改動', () => {
        const input = spirit();
        const talisman = buildStartingSpiritTalisman(input, true)!;
        assert.isTrue(!('generalUid' in talisman));
        assert.equals(3, input.geneIds.length);
    });

    suite.test('讀檔時結構正確的虎符原樣保留，基因超過上限會截斷', () => {
        const talisman = normalizeStartingTalisman({ kind: 'TALISMAN', sourceSpiritId: 'SPIRIT_ZHAOYUN', sourceName: '趙雲', geneIds: ['GENE_A', 'GENE_B', 'GENE_C'] })!;
        assert.equals('SPIRIT_ZHAOYUN', talisman.sourceSpiritId);
        assert.equals('GENE_A,GENE_B', talisman.geneIds.join(','));
    });

    suite.test('讀檔時缺來源、種類不符或非物件的虎符一律丟棄', () => {
        assert.isTrue(normalizeStartingTalisman(null) === null);
        assert.isTrue(normalizeStartingTalisman('TALISMAN') === null);
        assert.isTrue(normalizeStartingTalisman({ kind: 'OTHER', sourceSpiritId: 'X', sourceName: 'X', geneIds: [] }) === null);
        assert.isTrue(normalizeStartingTalisman({ kind: 'TALISMAN', sourceName: '趙雲', geneIds: [] }) === null);
        assert.isTrue(normalizeStartingTalisman({ kind: 'TALISMAN', sourceSpiritId: 'X', sourceName: 'X', geneIds: 'GENE_A' }) === null);
    });

    suite.test('讀檔時基因陣列內的非字串元素被過濾', () => {
        const talisman = normalizeStartingTalisman({ kind: 'TALISMAN', sourceSpiritId: 'X', sourceName: 'X', geneIds: [1, 'GENE_B', null] })!;
        assert.equals('GENE_B', talisman.geneIds.join(','));
    });

    return suite;
}
