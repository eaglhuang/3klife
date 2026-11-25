/**
 * PlaytestYearSummary.test.ts — 年循環每季摘要行文字（PROG-2-10003）
 * 「戰鬥 失敗」是結算畫面的輸贏，不是腳本錯誤；步驟失敗另計，兩者不能混在一起。
 */
import { TestSuite, assert } from './TestRunner';

const { formatYearQuarterLine, battleResultLabel, formatFirstBattleLine, isKnownEnvError, evaluateFullYear } = require('../tools_node/playtest-year-summary') as {
    formatYearQuarterLine: (yq: { season: string | null; seasonAfter?: string | null; battles: Array<{ ok: boolean; result: string | null }>; errors: string[] }) => string;
    battleResultLabel: (battle: { ok: boolean; result: string | null }) => string;
    formatFirstBattleLine: (info: { weather?: string | null; tactic?: { ok?: boolean; tacticId?: string | null; reason?: string | null; fallbackFrom?: string | null; fallbackReason?: string | null; nodes?: number | null; hooks?: number | null; attempts?: number; noEnemyPolls?: number } | null }) => string;
    isKnownEnvError: (text: string) => boolean;
    evaluateFullYear: (input: { startOrdinal: number | null; baselineAdvances: number; baselineCasts?: number; baselineBattles?: number; endOrdinal: number | null; quarters: Array<Record<string, unknown>>; config?: Record<string, number> }) => { ok: boolean; checks: Array<{ name: string; ok: boolean; reason: string | null }>; lines: string[] };
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

    suite.test('首戰摘要：失敗帶嘗試統計與細分原因', () => {
        const line = formatFirstBattleLine({ weather: 'WINDY', tactic: { ok: false, reason: 'tactic-fire-scheme:CAST_NOT_APPLIED（存活敵軍 2、我方受傷 0/5、SP 100/100、TP 免扣、blockedReason no-target）', attempts: 12, noEnemyPolls: 4 } });
        assert.equals('首戰天氣 WINDY；計謀 失敗（tactic-fire-scheme:CAST_NOT_APPLIED（存活敵軍 2、我方受傷 0/5、SP 100/100、TP 免扣、blockedReason no-target）；嘗試 12 次、無敵軍空檔 4 次）；格子特效 無', line);
        assert.equals('首戰天氣 ?；計謀 失敗（NO_ENEMY_ALIVE；嘗試 0 次、無敵軍空檔 0 次）；格子特效 無', formatFirstBattleLine({ weather: null, tactic: { ok: false, reason: 'NO_ENEMY_ALIVE', attempts: 0 } }));
    });

    suite.test('已知環境錯誤：NPC brain 對話被本機網路存取檢查擋下的三種樣態', () => {
        const u = 'http://127.0.0.1:8765/v1/npc/dialogue';
        assert.equals(true, isKnownEnvError(`POST ${u} net::ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`));
        assert.equals(true, isKnownEnvError(`POST ${u} net::ERR_FAILED`));
        assert.equals(true, isKnownEnvError(`Access to fetch at '${u}' from origin 'https://x.github.io' has been blocked by CORS policy: loopback address space`));
        assert.equals(false, isKnownEnvError('POST http://127.0.0.1:8765/v1/other net::ERR_FAILED'));
        assert.equals(false, isKnownEnvError(`GET ${u} 500`));
        assert.equals(false, isKnownEnvError('TypeError: x is undefined'));
    });

    suite.test('全年斷言：四季推進、放招、年終守城、換年都通過', () => {
        const q = (o: number, extra: Record<string, unknown> = {}) => ({ ordinal: o, seasonAfterOrdinal: o + 1, season: 's' + o, battles: [{ ok: true, result: '勝利', tactic: { ok: o === 4 } }], topBefore: { jade: 1, silver: 2 }, topAfter: { jade: 3, silver: 4 }, yearEndBattles: o === 7 ? 1 : 0, errors: [], ...extra });
        const r = evaluateFullYear({ startOrdinal: 5, baselineAdvances: 1, endOrdinal: 8, quarters: [q(5), q(6), q(7)] });
        assert.equals(false, r.ok); // 沒放招
        const r2 = evaluateFullYear({ startOrdinal: 5, baselineAdvances: 1, endOrdinal: 8, quarters: [q(5, { battles: [{ ok: true, result: '勝利', tactic: { ok: true } }] }), q(6), q(7)] });
        assert.equals(true, r2.ok);
    });

    suite.test('全年斷言：開年前已打的首戰放招與進戰場一併計入', () => {
        const q = (o: number) => ({ ordinal: o, seasonAfterOrdinal: o + 1, season: 's' + o, battles: [{ ok: true, result: '勝利', tactic: { ok: false } }], yearEndBattles: o === 7 ? 1 : 0, errors: [] });
        const r = evaluateFullYear({ startOrdinal: 7, baselineAdvances: 3, baselineCasts: 1, baselineBattles: 1, endOrdinal: 8, quarters: [q(7)] });
        assert.equals(true, r.ok);
        assert.equals(false, evaluateFullYear({ startOrdinal: 7, baselineAdvances: 3, baselineCasts: 0, endOrdinal: 8, quarters: [q(7)] }).ok);
    });

    suite.test('全年斷言：沒換年／沒進年終守城時失敗並說明哪一步', () => {
        const q = (o: number, extra: Record<string, unknown> = {}) => ({ ordinal: o, seasonAfterOrdinal: o + 1, season: 's' + o, battles: [{ ok: true, result: '勝利', tactic: { ok: true } }], yearEndBattles: 0, errors: [], ...extra });
        const r = evaluateFullYear({ startOrdinal: 4, baselineAdvances: 0, endOrdinal: 7, quarters: [q(4), q(5), q(6, { seasonAfterOrdinal: 6 }), q(7, { seasonAfterOrdinal: 7, errors: ['advance：季別沒有前進'] })] });
        assert.equals(false, r.ok);
        const failed = r.checks.filter((c) => !c.ok).map((c) => c.name);
        assert.equals(true, failed.includes('年終守城結算'));
        assert.equals(true, failed.includes('換年後年份加一且為第一季'));
        assert.equals(true, r.checks.some((c) => !c.ok && /advance 錯誤：advance：季別沒有前進/.test(c.reason || '')));
    });

    return suite;
}
