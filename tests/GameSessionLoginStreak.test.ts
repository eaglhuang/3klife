/**
 * GameSessionLoginStreak.test.ts — 連續登入統計跨存讀檔（PROG-2-0987）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';

function at(day: string): number {
    return Date.parse(`${day}T10:00:00+08:00`);
}

function roundTrip(snapshot: PlayerSaveSnapshot): PlayerSaveSnapshot {
    return JSON.parse(JSON.stringify(snapshot)) as PlayerSaveSnapshot;
}

export function createGameSessionLoginStreakSuite(): TestSuite {
    const suite = new TestSuite('GameSessionLoginStreak (PROG-2-0987 連續登入接線)');

    suite.test('從未登入時為 0 天；登入一次後為 1 天', () => {
        const session = new GameSession(1);
        assert.equals(0, session.loginStreak.consecutiveDays);
        session.recordLoginAt(at('2026-10-27'));
        assert.equals(1, session.loginStreak.consecutiveDays);
    });

    suite.test('連續三天登入為 3 天，漏一天後歸 1', () => {
        const session = new GameSession(1);
        session.recordLoginAt(at('2026-10-27'));
        session.recordLoginAt(at('2026-10-28'));
        session.recordLoginAt(at('2026-10-29'));
        assert.equals(3, session.loginStreak.consecutiveDays);
        session.recordLoginAt(at('2026-10-31'));
        assert.equals(1, session.loginStreak.consecutiveDays);
    });

    suite.test('從未登入時不寫入欄位；有紀錄後跨存讀檔保留', () => {
        const empty = new GameSession(1);
        assert.isTrue(empty.createSnapshot(new Date(0)).loginStreak === undefined);

        const session = new GameSession(1);
        session.recordLoginAt(at('2026-10-27'));
        session.recordLoginAt(at('2026-10-28'));
        const restored = new GameSession(1);
        restored.restoreLifespanState(roundTrip(session.createSnapshot(new Date(0))));
        assert.equals(2, restored.loginStreak.consecutiveDays);
        assert.equals('2026-10-28', restored.loginStreak.lastLoginDay!);
    });

    suite.test('舊檔沒有 loginStreak 欄位時為從未登入', () => {
        const session = new GameSession(1);
        session.restoreLifespanState({} as PlayerSaveSnapshot);
        assert.equals(0, session.loginStreak.consecutiveDays);
        assert.isTrue(session.loginStreak.lastLoginDay === null);
    });

    return suite;
}
