/**
 * LeaderboardCaller.test.ts — GameSession 排行榜呼叫端（PROG-2-0955）
 *
 * Unity 對照：EditMode Test，驗證畫面只呼叫 Session 的查詢，排序與取前 N 名由資料層完成。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function makeGeneral(id: string, battleRecord?: Record<string, number>): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
        ...(battleRecord ? { battleRecord: { wins: 0, losses: 0, draws: 0, merit: 0, ...battleRecord } } : {}),
    } as unknown as GeneralConfig;
}

export function createLeaderboardCallerSuite(): TestSuite {
    const suite = new TestSuite('LeaderboardCaller (PROG-2-0955)');

    suite.test('依傷害排行並取前 N 名，舊武將沒有戰績時當 0', () => {
        const session = new GameSession(2);
        session.setRosterStore(new InMemoryRosterStore([
            makeGeneral('a', { totalDamage: 300, kills: 1 }),
            makeGeneral('b', { totalDamage: 900, kills: 2 }),
            makeGeneral('c'),
        ]));
        const ranked = session.rankBattleLeaderboard('damage', 2);
        assert.equals(2, ranked.length);
        assert.equals('b', ranked[0]?.generalId ?? '');
        assert.equals('a', ranked[1]?.generalId ?? '');
    });

    suite.test('空名冊回傳空陣列', () => {
        const session = new GameSession(2);
        session.setRosterStore(new InMemoryRosterStore([]));
        assert.equals(0, session.rankBattleLeaderboard('kills', 5).length);
    });

    return suite;
}
