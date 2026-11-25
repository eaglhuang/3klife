/**
 * PlaytestYearSummary.test.ts — 年循環每季摘要行文字（PROG-2-10003）
 * 「戰鬥 失敗」是結算畫面的輸贏，不是腳本錯誤；步驟失敗另計，兩者不能混在一起。
 */
import { TestSuite, assert } from './TestRunner';

const { formatYearQuarterLine, battleResultLabel } = require('../tools_node/playtest-year-summary') as {
    formatYearQuarterLine: (yq: { season: string | null; seasonAfter?: string | null; battles: Array<{ ok: boolean; result: string | null }>; errors: string[] }) => string;
    battleResultLabel: (battle: { ok: boolean; result: string | null }) => string;
};

export function createPlaytestYearSummarySuite(): TestSuite {
    const suite = new TestSuite('PlaytestYearSummary (年循環摘要行 PROG-2-10003)');

    suite.test('結算畫面「失敗」顯示為敗北，不再叫失敗', () => {
        assert.equals('敗北', battleResultLabel({ ok: true, result: '失敗' }));
        assert.equals('敗北', battleResultLabel({ ok: true, result: '戰敗' }));
        assert.equals('勝利', battleResultLabel({ ok: true, result: '勝利' }));
        assert.equals('極速：勝利', battleResultLabel({ ok: true, result: '極速：勝利' }));
    });

    suite.test('戰鬥步驟自己失敗（沒打到結算）顯示步驟失敗；讀不到結果顯示 ?', () => {
        assert.equals('步驟失敗', battleResultLabel({ ok: false, result: null }));
        assert.equals('?', battleResultLabel({ ok: true, result: null }));
    });

    suite.test('摘要行：敗北與步驟失敗筆數分開寫，並註明不含戰鬥輸贏', () => {
        const line = formatYearQuarterLine({
            season: '第 1 年 4 季', seasonAfter: '第 2 年 1 季',
            battles: [{ ok: true, result: '失敗' }, { ok: true, result: '勝利' }],
            errors: ['nurture：學府入學畫面沒有出現'],
        });
        assert.equals('年循環 第 1 年 4 季 → 第 2 年 1 季：戰鬥 敗北/勝利；步驟失敗 1（戰鬥輸贏不算在內）', line);
    });

    suite.test('沒打戰鬥顯示無；沒讀到換季後季別顯示 ?', () => {
        const line = formatYearQuarterLine({ season: '第 1 年 1 季', battles: [], errors: [] });
        assert.equals('年循環 第 1 年 1 季 → ?：戰鬥 無；步驟失敗 0（戰鬥輸贏不算在內）', line);
    });

    return suite;
}
