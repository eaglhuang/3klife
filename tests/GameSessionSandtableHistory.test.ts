/**
 * GameSessionSandtableHistory.test.ts — 世界沙盤解鎖歷史的存讀與有效階段（PROG-2-1200，HALL-08）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';

function roundTrip(snapshot: PlayerSaveSnapshot): PlayerSaveSnapshot {
    return JSON.parse(JSON.stringify(snapshot)) as PlayerSaveSnapshot;
}

export function createGameSessionSandtableHistorySuite(): TestSuite {
    const suite = new TestSuite('GameSessionSandtableHistory (PROG-2-1200 沙盤解鎖歷史)');

    suite.test('新遊戲沒有解鎖歷史，沙盤尚未開放，存檔不寫入欄位', () => {
        const session = new GameSession(1);
        assert.equals(0, session.sandtableUnlockHistory.length);
        assert.isTrue(session.sandtableStage === null);
        assert.isTrue(session.createSnapshot(new Date(0)).sandtableUnlockHistory === undefined);
    });

    suite.test('解鎖歷史跨存讀檔保留，有效階段取歷史最高階段', () => {
        const session = new GameSession(1);
        session.restoreLifespanState({ sandtableUnlockHistory: ['S1_CENTRAL', 'S2_BORDER'] } as unknown as PlayerSaveSnapshot);
        assert.equals('S2', session.sandtableStage!);

        const snapshot = roundTrip(session.createSnapshot(new Date(0)));
        assert.equals('S1_CENTRAL,S2_BORDER', snapshot.sandtableUnlockHistory!.join(','));

        const restored = new GameSession(1);
        restored.restoreLifespanState(snapshot);
        assert.equals('S2', restored.sandtableStage!);
    });

    suite.test('壞資料的解鎖歷史在讀檔時被過濾，不會讓沙盤出現未知階段', () => {
        const session = new GameSession(1);
        session.restoreLifespanState({ sandtableUnlockHistory: ['NOPE', 'S1_CENTRAL'] } as unknown as PlayerSaveSnapshot);
        assert.equals('S1', session.sandtableStage!);
        assert.equals(1, session.sandtableUnlockHistory.length);
    });

    suite.test('回傳的歷史是複本，改動不會回寫到會話', () => {
        const session = new GameSession(1);
        session.restoreLifespanState({ sandtableUnlockHistory: ['S1_CENTRAL'] } as unknown as PlayerSaveSnapshot);
        (session.sandtableUnlockHistory as unknown as string[]).push('S3_GLOBAL');
        assert.equals(1, session.sandtableUnlockHistory.length);
    });

    return suite;
}
