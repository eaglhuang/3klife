/**
 * PlaytestBootAbort.test.ts — 線上驗收腳本開機步驟：輪詢「開始遊戲」＋失敗時中止（不再跑後續步驟）
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

const { buildBootAbortReason } = require('../tools_node/playtest-online.js') as {
    buildBootAbortReason: (rec: { reason?: string; detail?: { lastLoadingTexts?: string[] } } | undefined) => string;
};

export function createPlaytestBootAbortSuite(): TestSuite {
    const suite = new TestSuite('PlaytestBootAbort (playtest-online 開機輪詢與中止)');

    suite.test('buildBootAbortReason 帶出原因與最後畫面文字', () => {
        const r = buildBootAbortReason({ reason: '逾時 120 秒：未出現開始遊戲', detail: { lastLoadingTexts: ['正在連動遊戲'] } });
        assert.contains(r, '逾時 120 秒');
        assert.contains(r, '正在連動遊戲');
        assert.contains(buildBootAbortReason(undefined), '未執行');
    });

    suite.test('腳本以 stuckMs 輪詢開始鈕，且開機失敗即 boot-abort', () => {
        const src = fs.readFileSync(path.join(__dirname, '..', 'tools_node', 'playtest-online.js'), 'utf8');
        assert.contains(src, 'waitLoginStartReady');
        assert.contains(src, 'if (!bootOk)');
        assert.contains(src, 'boot-abort');
        assert.isFalse(src.includes("await delay(Number(args['login-settle'] || 12000));\n            rec.detail.bootToLoginMs"));
    });

    return suite;
}
