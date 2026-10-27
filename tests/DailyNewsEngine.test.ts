/**
 * PROG-2-1169：三國日報事件引擎（插槽式敘事）
 */

import { assert, TestSuite } from './TestRunner';
import {
    buildNarrative, candidateNewsTypes, duelLogType, dailyNewsTitle, DAILY_NEWS_LOG_WINDOW_MS, generateDailyNews, NEWS_TRIGGER_TABLE,
    recentLogs, type PlayerLogEntry,
} from '../assets/scripts/core/systems/DailyNewsEngine';

function seq(values: number[]): () => number {
    let i = 0;
    return () => values[i++ % values.length];
}

const NOW = 1_800_000_000_000;
const ROSTER = [{ name: '張飛' }, { name: '關羽' }, { name: '劉備' }];

export function createDailyNewsEngineSuite(): TestSuite {
    const suite = new TestSuite('DailyNewsEngine');

    suite.test('觸發表涵蓋 12 種 Log', () => {
        assert.equals(12, Object.keys(NEWS_TRIGGER_TABLE).length);
        assert.equals(JSON.stringify(['COMFORT', 'REVENGE']), JSON.stringify(NEWS_TRIGGER_TABLE.BATTLE_LOSE));
    });

    suite.test('只取前 24h 的 Log；沒有 Log 視為 IDLE_LONG', () => {
        const logs: PlayerLogEntry[] = [
            { type: 'BATTLE_WIN', at: NOW - DAILY_NEWS_LOG_WINDOW_MS - 1 },
            { type: 'GACHA_FAIL', at: NOW - 1000 },
        ];
        assert.equals(JSON.stringify(['GACHA_FAIL']), JSON.stringify(recentLogs(logs, NOW).map((l) => l.type)));
        assert.equals(JSON.stringify(['IDLE_LONG']), JSON.stringify(recentLogs([], NOW).map((l) => l.type)));
    });

    suite.test('候選類型去重', () => {
        const types = candidateNewsTypes([{ type: 'BATTLE_LOSE', at: NOW }, { type: 'DUEL_LOSE', at: NOW }]);
        assert.equals(JSON.stringify(['COMFORT', 'REVENGE']), JSON.stringify(types));
    });

    suite.test('每次 1~3 條、不重複類型、不超過候選數', () => {
        const logs: PlayerLogEntry[] = [{ type: 'BATTLE_LOSE', at: NOW }, { type: 'BATTLE_WIN', at: NOW }];
        for (const r of [0, 0.34, 0.67, 0.99]) {
            const news = generateDailyNews(logs, ROSTER, NOW, seq([r]));
            assert.isTrue(news.length >= 1 && news.length <= 3);
            assert.equals(news.length, new Set(news.map((n) => n.type)).size);
        }
        const single = generateDailyNews([{ type: 'GACHA_SUCCESS', at: NOW }], ROSTER, NOW, seq([0.99]));
        assert.equals(1, single.length);
        assert.equals('GOSSIP', single[0].type);
    });

    suite.test('復仇：情緒憤怒、取回 5%~20%、帶入損失資源', () => {
        const low = buildNarrative('REVENGE', ROSTER[0], [], '金錢', seq([0]));
        const high = buildNarrative('REVENGE', ROSTER[0], [], '金錢', seq([0.999]));
        assert.equals('憤怒', low.emotion);
        assert.equals('取回了 5% 的金錢！', low.result);
        assert.equals('取回了 20% 的金錢！', high.result);
        const news = generateDailyNews([{ type: 'RESOURCE_LOW', at: NOW, resource: '糧草' }], ROSTER, NOW, seq([0]));
        assert.equals('REVENGE', news[0].type);
        assert.isTrue(news[0].action.includes('糧草'));
    });

    suite.test('代勞：情緒得意', () => {
        assert.equals('得意', buildNarrative('AUTO_TASK', ROSTER[1], [], '糧草', seq([0])).emotion);
    });

    suite.test('名冊為空回傳空陣列', () => {
        assert.equals(0, generateDailyNews([{ type: 'BATTLE_WIN', at: NOW }], [], NOW, seq([0.5])).length);
    });

    suite.test('單挑成立分出勝負才記；拒絕或平手不記（PROG-2-1172）', () => {
        assert.equals('DUEL_WIN', duelLogType('player-win', true));
        assert.equals('DUEL_LOSE', duelLogType('enemy-win', true));
        assert.equals(null, duelLogType('player-win', false));
        assert.equals(null, duelLogType('draw', true));
    });

    suite.test('頭條格式', () => {
        assert.equals('三國日報 —— 2026-03-28', dailyNewsTitle(new Date(2026, 2, 28)));
    });

    return suite;
}
