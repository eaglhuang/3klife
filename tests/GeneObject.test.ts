/**
 * GeneObject — 遺傳因子槽結構、驗證與序列化（WBS GEN-02，PROG-2-0550）
 *
 * 第一組用 gene-dictionary.json 與 generals.json 的真實資料；其餘用手拉的資料測錯誤路徑。
 */
import { assert, TestSuite } from './TestRunner';
import {
    findDuplicateGeneIds,
    GeneDictionaryEntry,
    GeneObject,
    normalizeGeneObjects,
    parseGeneObjects,
    RawGene,
    serializeGeneObjects,
    validateGeneCount,
} from '../assets/scripts/core/models/GeneObject';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');

function loadDictionary(): Map<string, GeneDictionaryEntry> {
    const raw = JSON.parse(fs.readFileSync('assets/resources/data/master/gene-dictionary.json', 'utf8')) as {
        data: Array<{ id: string; color: string; maxLevel: number }>;
    };
    return new Map(raw.data.map((d) => [d.id, { id: d.id, color: d.color, maxLevel: d.maxLevel }]));
}

function sample(id: string, extra: RawGene = {}): RawGene {
    return { id, level: 2, ...extra };
}

function threeGenes(dictionary: Map<string, GeneDictionaryEntry>): GeneObject[] {
    const ids = [...dictionary.keys()].slice(0, 3);
    return normalizeGeneObjects(ids.map((id) => sample(id)), dictionary).genes;
}

export function createGeneObjectSuite(): TestSuite {
    const suite = new TestSuite('GeneObject (遺傳因子槽 GEN-02)');

    suite.test('真實資料：有因子的武將，因子 ID 都在字典內、數量 3~5、等級合法', () => {
        const dictionary = loadDictionary();
        const generals = JSON.parse(fs.readFileSync('assets/resources/data/generals.json', 'utf8')) as Array<{
            id: string;
            genes?: RawGene[];
        }>;
        const withGenes = generals.filter((g) => (g.genes ?? []).length > 0);
        assert.isTrue(withGenes.length > 0);
        for (const general of withGenes) {
            const { genes, errors } = normalizeGeneObjects(general.genes, dictionary);
            assert.equals(0, errors.length, `${general.id}: ${errors.join('; ')}`);
            assert.equals(null, validateGeneCount(genes), general.id);
            assert.equals(0, findDuplicateGeneIds(genes).length, general.id);
        }
    });

    suite.test('真實資料：沒有因子的武將回報為資料待補，不是錯誤', () => {
        const dictionary = loadDictionary();
        const generals = JSON.parse(fs.readFileSync('assets/resources/data/generals.json', 'utf8')) as Array<{
            genes?: RawGene[];
        }>;
        const missing = generals.filter((g) => (g.genes ?? []).length === 0);
        assert.isTrue(missing.length > 0);
        assert.equals('missing', validateGeneCount(normalizeGeneObjects(missing[0].genes, dictionary).genes) ?? '');
    });

    suite.test('正規化：Type 取字典的六色，缺的 isLocked 與 discoveryLevel 補預設', () => {
        const dictionary = loadDictionary();
        const [first] = [...dictionary.keys()];
        const { genes, errors } = normalizeGeneObjects([sample(first)], dictionary);
        assert.equals(0, errors.length);
        assert.equals(dictionary.get(first)!.color, genes[0].type);
        assert.equals(false, genes[0].isLocked);
        assert.equals(1, genes[0].discoveryLevel);
    });

    suite.test('錯誤路徑：字典沒有的 ID、等級超過上限、Is_Locked 非布林都會回報並丟掉該筆', () => {
        const dictionary = loadDictionary();
        const [first] = [...dictionary.keys()];
        const maxLevel = dictionary.get(first)!.maxLevel;
        const { genes, errors } = normalizeGeneObjects([
            sample('no-such-gene'),
            sample(first, { level: maxLevel + 1 }),
            sample(first, { isLocked: 'yes' }),
        ], dictionary);
        assert.equals(0, genes.length);
        assert.equals(3, errors.length);
        assert.isTrue(errors[0].includes('不在因子字典'));
        assert.isTrue(errors[1].includes(`1..${maxLevel}`));
        assert.isTrue(errors[2].includes('布林'));
    });

    suite.test('數量：2 個或 6 個不通過；0 個回傳 missing', () => {
        const dictionary = loadDictionary();
        const three = threeGenes(dictionary);
        assert.equals(null, validateGeneCount(three));
        assert.isTrue((validateGeneCount(three.slice(0, 2)) ?? '').includes('3~5'));
        const six = [...three, ...three].slice(0, 6);
        assert.isTrue((validateGeneCount(six) ?? '').includes('3~5'));
        assert.equals('missing', validateGeneCount([]) ?? '');
    });

    suite.test('重複因子 ID 會被找出來', () => {
        const dictionary = loadDictionary();
        const [first] = [...dictionary.keys()];
        const { genes } = normalizeGeneObjects([sample(first), sample(first)], dictionary);
        assert.equals(first, findDuplicateGeneIds(genes).join(','));
    });

    suite.test('序列化往返一致；壞掉的 JSON 回傳 null 而不丟例外', () => {
        const dictionary = loadDictionary();
        const genes = threeGenes(dictionary);
        const restored = parseGeneObjects(serializeGeneObjects(genes));
        assert.isTrue(restored !== null);
        assert.equals(serializeGeneObjects(genes), serializeGeneObjects(restored!));
        assert.equals(null, parseGeneObjects('{not json'));
        assert.equals(null, parseGeneObjects('{"a":1}'));
        assert.equals(null, parseGeneObjects('[{"type":"blue","id":"x","level":"2"}]'));
    });

    return suite;
}
