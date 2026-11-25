/**
 * PlaytestYearSummary.test.ts — 年循環每季摘要行文字（PROG-2-10003）
 * 「戰鬥 失敗」是結算畫面的輸贏，不是腳本錯誤；步驟失敗另計，兩者不能混在一起。
 */
import { TestSuite, assert } from './TestRunner';

const { formatYearQuarterLine, battleResultLabel, formatFirstBattleLine } = require('../tools_node/playtest-year-summary') as {
    formatYearQuarterLine: (yq: { season: string | null; seasonAfter?: string | null; battles: Array<{ ok: boolean; result: string | null }>; errors: string[] }) => string;
    battleResultLabel: (battle: { ok: boolean; result: string | null }) => string;
    formatFirstBattleLine: (info: { weather?: string | null; tactic?: { ok?: boolean; tacticId?: string | null; reason?: string | null; fallbackFrom?: string | null; fallbackReason?: string | null; nodes?: number | null; hooks?: number | null } | null }) => string;
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

    suite.test('首戰摘要：火計成功，寫出天氣、計謀與格子特效數', () => {
        const line = formatFirstBattleLine({ weather: 'WINDY', tactic: { ok: true, tacticId: 'tactic-fire-scheme', nodes: 3, hooks: 1 } });
        assert.equals('首戰天氣 WINDY；計謀 tactic-fire-scheme 成功；格子特效 3（hook 1）', line);
    });

    suite.test('首戰摘要：天氣不符改放別的計謀，如實記錄原因', () => {
        const line = formatFirstBattleLine({ weather: 'SUNNY', tactic: { ok: true, tacticId: 'tactic-morale-rally', fallbackFrom: 'tactic-fire-scheme', fallbackReason: 'CONDITION_UNMET', nodes: 0, hooks: 0 } });
        assert.equals('首戰天氣 SUNNY；計謀 tactic-morale-rally 成功（tactic-fire-scheme 改放：CONDITION_UNMET）；格子特效 0（hook 0）', line);
    });

    suite.test('首戰摘要：施放失敗寫原因，沒有格子特效；沒讀到天氣顯示 ?', () => {
        assert.equals('首戰天氣 SUNNY；計謀 失敗（TP_SHORT）；格子特效 無', formatFirstBattleLine({ weather: 'SUNNY', tactic: { ok: false, reason: 'TP_SHORT' } }));
        assert.equals('首戰天氣 ?；計謀 失敗（未嘗試）；格子特效 無', formatFirstBattleLine({ weather: null, tactic: null }));
    });

    return suite;
}
