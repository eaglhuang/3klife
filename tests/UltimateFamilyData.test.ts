/**
 * UltimateFamilyData.test.ts — 奧義定義的效果家族欄位（ULT-12 資料缺口，PROG-2-1062）headless 測試
 *
 * 鎖住：ultimate-definitions.json 的每一筆都有合法的 family（8 個家族之一）。演出解析見 UltimateCinematic。家族分類為草稿，依奧義系統.md 效果文字判定，待 PM 確認。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { UltimateEffectFamily } from '../assets/scripts/shared/SkillRuntimeContract';

const ROOT = path.resolve(__dirname, '..');
const DEFINITIONS = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/master/ultimate-definitions.json'), 'utf8')) as {
    data: Array<{ id: string; family?: string }>;
};

export function createUltimateFamilyDataSuite(): TestSuite {
    const suite = new TestSuite('UltimateFamilyData (奧義效果家族資料 ULT-12 PROG-2-1062)');
    const families = new Set<string>(Object.values(UltimateEffectFamily));

    suite.test('65 筆奧義都有合法的效果家族', () => {
        assert.equals(65, DEFINITIONS.data.length);
        DEFINITIONS.data.forEach((definition) => {
            assert.isTrue(typeof definition.family === 'string' && families.has(definition.family));
        });
    });


    return suite;
}
