/**
 * TagPoolAncestorLookup.test.ts — 血統色譜 Tag Pool 呼叫端核對（BLT-13 / PROG-2-0722）headless 測試
 *
 * 鎖住：每位名將的虛擬祖先，其因子都以字典 id 引用（查得到字典行）、色系為六色之一；
 * 字典沒有隱藏因子以外的未知色系。呼叫鏈：ServiceLoader 注入字典 → BreedingService → generateVirtualAncestry。
 */
import { assert, TestSuite } from './TestRunner';
import { buildFactorDictionary, FactorDictionary, resolveFactorColor } from '../assets/scripts/core/systems/FactorInheritance';
import { generateVirtualAncestry } from '../assets/scripts/core/systems/VirtualAncestorGenerator';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');
const readJson = <T>(rel: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
const SIX_COLORS = ['green', 'blue', 'pink', 'white', 'red', 'purple'];

export function createTagPoolAncestorLookupSuite(): TestSuite {
    const suite = new TestSuite('TagPoolAncestorLookup (血統色譜 Tag Pool 呼叫端 BLT-13)');

    const dictionary: FactorDictionary = buildFactorDictionary(readJson('assets/resources/data/master/gene-dictionary.json'));
    const rawGenerals = readJson<{ id: string }[] | { data: { id: string }[] }>('assets/resources/data/generals.json');
    const generals = (Array.isArray(rawGenerals) ? rawGenerals : rawGenerals.data) as Array<{ id: string } & Record<string, unknown>>;

    suite.test('字典六色齊備，每色至少一筆（Tag Pool 的色譜來源）', () => {
        const colors = new Set(Array.from(dictionary.values()).map((def) => def.color));
        for (const color of SIX_COLORS) assert.isTrue(colors.has(color), `缺少色 ${color}`);
    });

    suite.test('每位名將的虛擬祖先因子都以字典 id 引用，且色系可解析為六色之一', () => {
        let checked = 0;
        for (const general of generals) {
            const ancestry = generateVirtualAncestry(general as never, { dictionary });
            for (const ancestor of ancestry.ancestors) {
                for (const factor of ancestor.factors) {
                    checked += 1;
                    assert.isTrue(dictionary.has(factor.id), `${general.id} 的祖先引用了字典外的因子 ${factor.id}`);
                    const color = resolveFactorColor(factor.id, dictionary);
                    assert.isTrue(color !== null && SIX_COLORS.includes(color), `${factor.id} 色系不是六色之一`);
                }
            }
        }
        assert.isTrue(checked > 0, '應該至少檢查到一個祖先因子');
    });

    suite.test('沒有字典時祖先仍可生成，但因子色系不回退到金色', () => {
        const sample = generals[0];
        const ancestry = generateVirtualAncestry(sample as never, {});
        for (const ancestor of ancestry.ancestors) {
            for (const factor of ancestor.factors) {
                assert.isFalse(factor.color === ('gold' as never), '不應出現已廢止的金色');
            }
        }
    });

    return suite;
}
