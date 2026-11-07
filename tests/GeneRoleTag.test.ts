/**
 * GeneRoleTag — 七色因子職能標籤（doc_spec_0321；PROG-2-1947）
 */
import { assert, TestSuite } from './TestRunner';
import { GENE_ROLE_THEME_TOKENS, hasRoleHalo, primaryRoleTag } from '../assets/scripts/core/systems/GeneRoleTag';

export function createGeneRoleTagSuite(): TestSuite {
    const suite = new TestSuite('GeneRoleTag (因子色彩職能 doc_spec_0321 PROG-2-1947)');

    suite.test('金色優先、星級總和最高、平手依序仲裁', () => {
        assert.equals('SUPREME_COMMANDER', primaryRoleTag([{ color: 'blue', star: 9 }, { color: 'gold', star: 1 }]));
        assert.equals('TACTICAL_STRATEGIST', primaryRoleTag([{ color: 'blue', star: 2 }, { color: 'green', star: 2 }, { color: 'green', star: 1 }]));
        assert.equals('VANGUARD_BERSERKER', primaryRoleTag([{ color: 'blue', star: 3 }, { color: 'pink', star: 3 }]));
        assert.equals('NOBLE_SAGE', primaryRoleTag([{ color: 'silver', star: 2 }, { color: 'purple', star: 2 }]));
        assert.equals(null, primaryRoleTag([{ color: 'red', star: 5 }]));
        assert.equals(null, primaryRoleTag([]));
    });

    suite.test('★4 光暈與 token 表', () => {
        assert.isTrue(hasRoleHalo([{ color: 'white', star: 4 }]));
        assert.isFalse(hasRoleHalo([{ color: 'white', star: 3 }, { color: 'red', star: 5 }]));
        assert.equals('color-gene-supreme', GENE_ROLE_THEME_TOKENS.SUPREME_COMMANDER.token);
        assert.equals(7, Object.keys(GENE_ROLE_THEME_TOKENS).length);
    });

    return suite;
}
