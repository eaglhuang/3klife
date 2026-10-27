/**
 * PROG-2-1170：三國日報接線（行為紀錄採集、登入生成、存檔）
 */

import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { appendPlayerLog, DAILY_NEWS_LOG_WINDOW_MS, PLAYER_LOG_LIMIT, refreshDailyNews } from '../assets/scripts/core/systems/DailyNewsEngine';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function at(day: string): number {
    return Date.parse(`${day}T10:00:00+08:00`);
}

function hero(id: string, name: string): GeneralConfig {
    return { id, name, faction: 'shu', hp: 1000, str: 80, int: 70, lea: 80, pol: 60, cha: 70 } as unknown as GeneralConfig;
}

function sessionWithRoster(): GameSession {
    const session = new GameSession(1);
    session.enrollGenerals([hero('zhang-fei', '張飛'), hero('guan-yu', '關羽')]);
    return session;
}

export function createGameSessionDailyNewsSuite(): TestSuite {
    const suite = new TestSuite('GameSessionDailyNews (PROG-2-1170 三國日報接線)');

    suite.test('appendPlayerLog：丟掉超過 24h 的舊紀錄並限制筆數', () => {
        const now = at('2026-10-27');
        let logs = appendPlayerLog([], { type: 'BATTLE_WIN', at: now - DAILY_NEWS_LOG_WINDOW_MS - 1 });
        logs = appendPlayerLog(logs, { type: 'GACHA_FAIL', at: now });
        assert.equals(JSON.stringify(['GACHA_FAIL']), JSON.stringify(logs.map((l) => l.type)));
        for (let i = 0; i < PLAYER_LOG_LIMIT + 5; i++) logs = appendPlayerLog(logs, { type: 'DUEL_WIN', at: now + i });
        assert.equals(PLAYER_LOG_LIMIT, logs.length);
    });

    suite.test('refreshDailyNews：同一天只生成一次；名冊為空不生成', () => {
        const roster = [{ name: '張飛' }];
        const first = refreshDailyNews({ lastGeneratedDay: null, lastLoginMs: null, news: [] }, [], roster, at('2026-10-27'), () => 0.5);
        assert.equals('2026-10-27', first.lastGeneratedDay);
        assert.isTrue(first.news.length >= 1);
        const again = refreshDailyNews(first, [{ type: 'BATTLE_LOSE', at: at('2026-10-27') }], roster, at('2026-10-27') + 3600_000, () => 0.5);
        assert.equals(JSON.stringify(first.news), JSON.stringify(again.news));
        const empty = refreshDailyNews({ lastGeneratedDay: null, lastLoginMs: null, news: [] }, [], [], at('2026-10-27'));
        assert.equals(null, empty.lastGeneratedDay);
    });

    suite.test('轉蛋入冊：抽到新武將記成功，全是重複記失敗；一般入冊不記', () => {
        const session = sessionWithRoster();
        assert.equals(0, session.playerLogs.length);
        session.enrollGenerals([hero('zhao-yun', '趙雲')], { rebirthOnDuplicate: true });
        session.enrollGenerals([hero('zhao-yun', '趙雲')], { rebirthOnDuplicate: true });
        assert.equals(JSON.stringify(['GACHA_SUCCESS', 'GACHA_FAIL']), JSON.stringify(session.playerLogs.map((l) => l.type)));
    });

    suite.test('戰鬥勝負寫入紀錄；平手不記', async () => {
        const session = sessionWithRoster();
        await session.recordBattle(['zhang-fei'], 'player-win');
        await session.recordBattle(['zhang-fei'], 'enemy-win');
        await session.recordBattle(['zhang-fei'], 'draw');
        assert.equals(JSON.stringify(['BATTLE_WIN', 'BATTLE_LOSE']), JSON.stringify(session.playerLogs.map((l) => l.type)));
    });

    suite.test('行為紀錄以最近一次登入時間為時間戳（確定、不用牆鐘）', () => {
        const session = sessionWithRoster();
        session.recordPlayerLog('DUEL_WIN');
        assert.equals(0, session.playerLogs[0].at);
        session.recordLoginAt(at('2026-10-27'));
        session.recordPlayerLog('DUEL_LOSE');
        // 未登入時的 0 時間戳已超過 24h，加新紀錄時被丟掉
        assert.equals(JSON.stringify([at('2026-10-27')]), JSON.stringify(session.playerLogs.map((l) => l.at)));
    });

    suite.test('上次登入超過 24h：舊紀錄被濾掉，日報走長時間未登入', () => {
        const session = sessionWithRoster();
        session.recordLoginAt(at('2026-10-25'));
        session.recordPlayerLog('BATTLE_LOSE');
        session.recordLoginAt(at('2026-10-27'));
        assert.isTrue(session.dailyNews.news.every((n) => ['AUTO_TASK', 'SHOPPING'].includes(n.type)));
    });

    suite.test('登入生成日報，標記已讀', () => {
        const session = sessionWithRoster();
        const now = Date.now();
        session.recordPlayerLog('BATTLE_LOSE', undefined, now - 1000);
        session.recordLoginAt(now);
        const news = session.dailyNews;
        assert.isTrue(news.news.length >= 1);
        assert.isTrue(news.news.every((n) => !n.read && ['COMFORT', 'REVENGE'].includes(n.type)));
        assert.isTrue(news.news.every((n) => ['張飛', '關羽'].includes(n.character)));
        session.markDailyNewsRead();
        assert.isTrue(session.dailyNews.news.every((n) => n.read));
    });

    suite.test('跨存讀檔保留紀錄與日報；新局清空', () => {
        const session = sessionWithRoster();
        const now = Date.now();
        session.recordPlayerLog('RESOURCE_LOW', '糧草', now - 1000);
        session.recordLoginAt(now);
        const snapshot = JSON.parse(JSON.stringify(session.createSnapshot())) as PlayerSaveSnapshot;
        assert.equals(1, snapshot.playerLogs?.length ?? 0);
        const restored = new GameSession(2);
        restored.restoreLifespanState(snapshot);
        assert.equals('糧草', restored.playerLogs[0].resource);
        assert.equals(JSON.stringify(session.dailyNews), JSON.stringify(restored.dailyNews));

        const fresh = new GameSession(3);
        assert.isTrue(fresh.createSnapshot().playerLogs === undefined);
        assert.isTrue(fresh.createSnapshot().dailyNews === undefined);
    });

    return suite;
}
