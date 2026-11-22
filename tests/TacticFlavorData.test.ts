/**
 * TacticFlavorData.test.ts — 戰法 descKey 資料與四語系字典一致
 *
 * 鎖住：有 descKey 的戰法在四個語系檔都查得到文字；描述 40～70 字；不含阿拉伯數字（數值由欄位顯示）。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';

const ROOT = path.resolve(__dirname, '..');
const readJson = (rel: string): any => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

export function createTacticFlavorDataSuite(): TestSuite {
    const suite = new TestSuite('TacticFlavorData (戰法招式描述 i18n)');
    const tactics: Array<{ id: string; descKey?: string }> = readJson('assets/resources/data/master/tactic-library.json').data;
    const withKey = tactics.filter((t) => t.descKey);

    suite.test('至少有 10 個戰法已寫招式描述', () => {
        assert.isTrue(withKey.length >= 10, `只有 ${withKey.length} 個`);
    });

    suite.test('descKey 在四語系都有字串，zh-TW 為 40～70 字且不寫數字', () => {
        const dicts: Record<string, Record<string, string>> = {};
        for (const l of ['zh-TW', 'zh-CN', 'en', 'ja']) dicts[l] = readJson(`assets/resources/i18n/${l}.json`);
        for (const t of withKey) {
            for (const l of Object.keys(dicts)) {
                assert.isTrue(typeof dicts[l][t.descKey!] === 'string' && dicts[l][t.descKey!].length > 0, `${l} 缺 ${t.descKey}`);
            }
            const n = [...dicts['zh-TW'][t.descKey!]].length;
            assert.isTrue(n >= 40 && n <= 70, `${t.id} 字數 ${n}`);
            assert.isTrue(!/[0-9]/.test(dicts['zh-TW'][t.descKey!]), `${t.id} 描述含數字`);
        }
    });

    return suite;
}
