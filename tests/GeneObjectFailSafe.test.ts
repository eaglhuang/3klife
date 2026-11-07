/**
 * GeneObjectFailSafe — 因子讀檔補齊、字典校驗與容錯修復（doc_spec_0332；PROG-2-2018）
 */
import { assert, TestSuite } from './TestRunner';
import {
    fallbackWhiteGeneId, genesFromSave, repairGeneObjects, validateGeneObjects, type GeneDictionaryRecord, type GeneObject,
} from '../assets/scripts/core/models/GeneObject';

const DICT: GeneDictionaryRecord = {
    gene_strategy: { color: 'green', maxLevel: 5 },
    gene_politics: { color: 'white', maxLevel: 3 },
    gene_fury: { color: 'white', maxLevel: 5 },
    gene_valor: { color: 'red', maxLevel: 5 },
};

function g(id: string, level = 1, type = DICT[id]?.color ?? 'white'): GeneObject {
    return { type, id, level, isLocked: false, discoveryLevel: 1 };
}

export function createGeneObjectFailSafeSuite(): TestSuite {
    const suite = new TestSuite('GeneObjectFailSafe (遺傳因子容錯 doc_spec_0332 PROG-2-2018)');

    suite.test('§2.2 舊存檔缺 isLocked／discoveryLevel 補預設值', () => {
        const r = genesFromSave([{ type: 'green', id: 'gene_strategy', level: 2, displayName: '謀略' }]);
        assert.isTrue(r.valid);
        assert.isFalse(r.genes[0].isLocked);
        assert.equals(1, r.genes[0].discoveryLevel);
        assert.equals('謀略', r.genes[0].displayName!);
        assert.isTrue(genesFromSave([]).valid);
    });

    suite.test('§3 validateGeneObjects 對齊字典', () => {
        const ok = [g('gene_strategy'), g('gene_politics'), g('gene_valor', 5)];
        assert.isTrue(validateGeneObjects(ok, DICT).isValid);
        assert.isTrue(validateGeneObjects([], DICT).isValid);
        assert.isTrue((validateGeneObjects([g('gene_strategy'), g('gene_politics')], DICT).invalidReason ?? '').includes('3~5'));
        assert.isTrue((validateGeneObjects([g('gene_strategy'), g('gene_politics'), g('gene_x')], DICT).invalidReason ?? '').includes('gene_x'));
        assert.isFalse(validateGeneObjects([g('gene_strategy', 1, 'blue'), g('gene_politics'), g('gene_valor')], DICT).isValid);
        assert.isFalse(validateGeneObjects([g('gene_strategy'), g('gene_politics', 4), g('gene_valor')], DICT).isValid);
        assert.isFalse(validateGeneObjects([g('gene_strategy'), g('gene_strategy'), g('gene_valor')], DICT).isValid);
    });

    suite.test('§1 等級 clamp、§3 未知因子降級白色', () => {
        assert.equals('gene_politics', fallbackWhiteGeneId(DICT)!);
        const r = repairGeneObjects([g('gene_valor', 9), g('gene_strategy', 0, 'blue'), { ...g('gene_unknown', 3), isLocked: true }], DICT);
        assert.equals(5, r.genes[0].level);
        assert.equals(1, r.genes[1].level);
        assert.equals('green', r.genes[1].type);
        assert.equals('gene_politics', r.genes[2].id);
        assert.equals('white', r.genes[2].type);
        assert.equals(3, r.genes[2].level);
        assert.isTrue(r.genes[2].isLocked);
        assert.equals(3, r.warnings.length);
    });

    suite.test('沒有白色因子可降級時移除該筆', () => {
        const r = repairGeneObjects([g('gene_unknown')], { gene_valor: { color: 'red', maxLevel: 5 } });
        assert.equals(0, r.genes.length);
        assert.equals(1, r.warnings.length);
    });

    return suite;
}
