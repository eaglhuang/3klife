/**
 * GeneDictionarySixColors.test.ts — 血統色譜六色字典（BLT-13，PROG-2-0863）
 *
 * Unity 對照：像一支 EditMode 的資料驗證測試，對 ScriptableObject 資料表做檢查：
 * 六色齊備、每色至少 3 筆、沒有規格外的顏色，筆數與 id 集合不因改色而變。
 */
import { assert, TestSuite } from './TestRunner';
import { ALL_FACTOR_COLORS } from '../assets/scripts/core/systems/FactorInheritance';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');
const DICTIONARY_PATH = 'assets/resources/data/master/gene-dictionary.json';

interface GeneDictionaryEntry {
    id: string;
    color: string;
}

function loadEntries(): GeneDictionaryEntry[] {
    const doc = JSON.parse(fs.readFileSync(path.join(ROOT, DICTIONARY_PATH), 'utf8')) as { data: GeneDictionaryEntry[] };
    return doc.data;
}

export function createGeneDictionarySixColorsSuite(): TestSuite {
    const suite = new TestSuite('GeneDictionarySixColors (血統色譜六色字典 BLT-13)');

    suite.test('六色齊備：字典只用藍粉綠紫白紅，且六色都出現', () => {
        const colors = new Set(loadEntries().map((entry) => entry.color));
        for (const color of ALL_FACTOR_COLORS) {
            assert.isTrue(colors.has(color));
        }
        assert.equals(ALL_FACTOR_COLORS.length, colors.size);
    });

    suite.test('每色至少 3 筆（驗收門檻）', () => {
        const counts = new Map<string, number>();
        for (const entry of loadEntries()) counts.set(entry.color, (counts.get(entry.color) ?? 0) + 1);
        for (const color of ALL_FACTOR_COLORS) {
            assert.isTrue((counts.get(color) ?? 0) >= 3);
        }
    });

    suite.test('沒有金色（規格外顏色已映射，PROG-2-0863）', () => {
        assert.isTrue(loadEntries().every((entry) => entry.color !== 'gold'));
    });

    suite.test('筆數與 id 集合不變：31 筆，gene_hidden_01~05 仍在（被武將與奧義表引用）', () => {
        const entries = loadEntries();
        assert.equals(31, entries.length);
        const ids = new Set(entries.map((entry) => entry.id));
        for (let i = 1; i <= 5; i++) {
            assert.isTrue(ids.has(`gene_hidden_0${i}`));
        }
    });

    return suite;
}
