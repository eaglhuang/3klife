/**
 * LoadingTipsSchema.test.ts — 血脈命鏡 Loading Tips 內容 schema 檢核（LT-05，PROG-2-1382）
 *
 * 鎖住：真實內容通過；四池缺漏、權重鍵不一致、佔位字、重複文案、權重全 0 都會被擋下。
 * Unity 對照：像 ScriptableObject 的 OnValidate，資料壞掉在 Build 前就報錯。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
const checkLoadingTips: (content: unknown) => string[] = require('../tools_node/validate-loading-tips').checkLoadingTips;

const REAL_PATH = join(__dirname, '..', 'assets', 'resources', 'ui-spec', 'content', 'bloodline-mirror-loading-tips-v1.json');

function validContent(): any {
    return {
        id: 'test',
        version: 1,
        categories: { system: ['a'], history: ['b'], bloodline: ['c'], tease: ['d'] },
        weights: {
            owned: { system: 1, history: 1, bloodline: 1, tease: 1 },
            unowned: { system: 1, history: 1, bloodline: 1, tease: 1 },
        },
    };
}

export function createLoadingTipsSchemaSuite(): TestSuite {
    const suite = new TestSuite('LoadingTipsSchema (血脈命鏡 Loading Tips 內容檢核 LT-05)');

    suite.test('真實內容檔通過檢核', () => {
        const real = JSON.parse(readFileSync(REAL_PATH, 'utf8'));
        assert.equals(0, checkLoadingTips(real).length);
    });

    suite.test('合法的最小內容通過', () => {
        assert.equals(0, checkLoadingTips(validContent()).length);
    });

    suite.test('缺一池或多一池都會被擋', () => {
        const missing = validContent();
        delete missing.categories.tease;
        assert.isTrue(checkLoadingTips(missing).some((msg) => msg.includes('四池')));
        const extra = validContent();
        extra.categories.extra = ['x'];
        assert.isTrue(checkLoadingTips(extra).some((msg) => msg.includes('四池')));
    });

    suite.test('權重鍵與四池不一致會被擋', () => {
        const content = validContent();
        delete content.weights.unowned.tease;
        assert.isTrue(checkLoadingTips(content).some((msg) => msg.includes('weights.unowned 的鍵')));
    });

    suite.test('佔位字、空字串與同池重複會被擋', () => {
        const content = validContent();
        content.categories.system = ['含 ??? 的文案', '   ', 'a'];
        content.categories.history = ['b', 'b'];
        const issues = checkLoadingTips(content);
        assert.isTrue(issues.some((msg) => msg.includes('佔位字')));
        assert.isTrue(issues.some((msg) => msg.includes('非空字串')));
        assert.isTrue(issues.some((msg) => msg.includes('重複')));
    });

    suite.test('權重為負或全部為 0 會被擋', () => {
        const negative = validContent();
        negative.weights.owned.system = -1;
        assert.isTrue(checkLoadingTips(negative).some((msg) => msg.includes('非負數')));
        const zero = validContent();
        zero.weights.unowned = { system: 0, history: 0, bloodline: 0, tease: 0 };
        assert.isTrue(checkLoadingTips(zero).some((msg) => msg.includes('大於 0')));
    });

    return suite;
}
