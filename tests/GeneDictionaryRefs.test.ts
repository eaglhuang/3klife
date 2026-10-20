/**
 * GeneDictionaryRefs.test.ts — 六色字典映射後的引用完整性（QA，PROG-2-0619）
 *
 * Unity 對照：像資料表的參照檢查（EditMode）——武將、奧義表、里程碑獎勵引用的因子 id 都要查得到字典，
 * 且顏色在規格六色內、里程碑宣告的顏色與字典一致。BLT-13 改色後不能讓任何引用斷掉。
 */
import { assert, TestSuite } from './TestRunner';
import { ALL_FACTOR_COLORS } from '../assets/scripts/core/systems/FactorInheritance';
import { MILESTONE_REWARDS } from '../assets/scripts/core/systems/MilestoneRewards';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const DATA = path.resolve(__dirname, '../assets/resources/data');

function readJson<T>(relative: string): T {
    return JSON.parse(fs.readFileSync(path.join(DATA, relative), 'utf8')) as T;
}

function dictionary(): Map<string, string> {
    const doc = readJson<{ data: Array<{ id: string; color: string }> }>('master/gene-dictionary.json');
    return new Map(doc.data.map((entry) => [entry.id, entry.color]));
}

export function createGeneDictionaryRefsSuite(): TestSuite {
    const suite = new TestSuite('GeneDictionaryRefs (六色字典引用完整性 BLT-13)');

    suite.test('武將資料的每個因子 id 都查得到字典，且顏色在六色內', () => {
        const dict = dictionary();
        const generals = readJson<Array<{ id: string; genes?: Array<{ id: string }> }>>('generals.json');
        let checked = 0;
        for (const general of generals) {
            for (const gene of general.genes ?? []) {
                checked++;
                assert.isTrue(dict.has(gene.id), `${general.id} 引用的因子 ${gene.id} 不在字典`);
                assert.isTrue((ALL_FACTOR_COLORS as readonly string[]).includes(dict.get(gene.id)!), `${gene.id} 顏色不在六色`);
            }
        }
        assert.isTrue(checked > 0);
    });

    suite.test('奧義表的 inheritanceGeneId 都查得到字典', () => {
        const dict = dictionary();
        const doc = readJson<{ data: Array<{ id: string; inheritanceGeneId?: string }> }>('master/ultimate-definitions.json');
        let checked = 0;
        for (const ultimate of doc.data) {
            if (!ultimate.inheritanceGeneId) continue;
            checked++;
            assert.isTrue(dict.has(ultimate.inheritanceGeneId), `${ultimate.id} 引用的因子 ${ultimate.inheritanceGeneId} 不在字典`);
        }
        assert.isTrue(checked > 0);
    });

    suite.test('里程碑隱藏因子：id 在字典，宣告顏色與字典顏色一致', () => {
        const dict = dictionary();
        let checked = 0;
        for (const items of Object.values(MILESTONE_REWARDS)) {
            for (const item of items) {
                if (item.kind !== 'hiddenFactor') continue;
                checked++;
                assert.isTrue(dict.has(item.factorId), `${item.factorId} 不在字典`);
                assert.equals(item.color, dict.get(item.factorId)!, `${item.factorId} 顏色與字典不一致`);
            }
        }
        assert.isTrue(checked > 0);
    });

    return suite;
}
