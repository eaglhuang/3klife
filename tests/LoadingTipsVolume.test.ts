/**
 * 命鏡載入 Tips 四池文案量（LT-04；PROG-2-2089）
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { LOADING_TIP_CATEGORIES } from '../assets/scripts/core/systems/LoadingTips';

/** 每池最少條數（暫定：規格未給數字，抽 1~2 條時 12 條約可撐 6 次載入不重複） */
const MIN_PER_POOL = 12;
/** 手機一行半可讀的長度上限（暫定） */
const MAX_TIP_LENGTH = 40;

export function createLoadingTipsVolumeSuite(): TestSuite {
    const suite = new TestSuite('LoadingTipsVolume (命鏡 Tips 文案量 LT-04 PROG-2-2089)');
    const content = JSON.parse(readFileSync(join(__dirname, '..', 'assets', 'resources', 'ui-spec', 'content', 'bloodline-mirror-loading-tips-v1.json'), 'utf8')) as { categories: Record<string, string[]> };

    suite.test(`四池各至少 ${MIN_PER_POOL} 條`, () => {
        for (const category of LOADING_TIP_CATEGORIES) {
            assert.isTrue(content.categories[category].length >= MIN_PER_POOL, `${category} 只有 ${content.categories[category].length} 條`);
        }
    });

    suite.test('全部文案不重複、不空白，且不超過手機可讀長度', () => {
        const all = LOADING_TIP_CATEGORIES.flatMap((category) => content.categories[category]);
        assert.equals(all.length, new Set(all).size);
        for (const tip of all) {
            assert.isTrue(tip.trim().length > 0);
            assert.isTrue([...tip].length <= MAX_TIP_LENGTH, `過長：${tip}`);
        }
    });

    return suite;
}
