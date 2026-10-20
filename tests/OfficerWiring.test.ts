/**
 * 官職快照的呼叫端接線（HALL-11 / PROG-2-0824）
 *
 * 鎖住：GameSession 預設為階位 1、可由呼叫端設定快照、沙盤階段對應 worldStage，
 * 以及未解鎖沙盤時 worldStage 退回 1（與既有大廳預設一致）。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { hallPlayerOf, officerUnlocksOf, normalizeOfficerSnapshot } from '../assets/scripts/core/systems/OfficerSnapshot';

export function createOfficerWiringSuite(): TestSuite {
    const suite = new TestSuite('OfficerWiring (官職快照接線 HALL-11)');

    suite.test('GameSession：未設定快照時為階位 1，沙盤未解鎖', () => {
        const session = new GameSession();
        assert.equals(1, session.officerUnlocks.tier);
        assert.isTrue(session.officerUnlocks.sandtableStage === null);
    });

    suite.test('GameSession：呼叫端設定階位 3 後解鎖 S1，壞值退回階位 1', () => {
        const session = new GameSession();
        session.setOfficerSnapshot({ tier: 3 });
        assert.equals(3, session.officerUnlocks.tier);
        assert.equals('S1', session.officerUnlocks.sandtableStage ?? '');
        session.setOfficerSnapshot({ tier: 'bad' });
        assert.equals(1, session.officerUnlocks.tier);
    });

    suite.test('大廳玩家狀態：階位即 rankTier，S1/S2/S3 對應 worldStage 1/2/3', () => {
        assert.equals(1, hallPlayerOf(officerUnlocksOf(normalizeOfficerSnapshot({ tier: 1 }))).rankTier);
        assert.equals(1, hallPlayerOf(officerUnlocksOf(normalizeOfficerSnapshot({ tier: 2 }))).worldStage);
        assert.equals(1, hallPlayerOf(officerUnlocksOf(normalizeOfficerSnapshot({ tier: 3 }))).worldStage);
        assert.equals(2, hallPlayerOf(officerUnlocksOf(normalizeOfficerSnapshot({ tier: 4 }))).worldStage);
        assert.equals(3, hallPlayerOf(officerUnlocksOf(normalizeOfficerSnapshot({ tier: 5 }))).worldStage);
        assert.equals(0, hallPlayerOf(officerUnlocksOf(normalizeOfficerSnapshot({ tier: 5 }))).intel);
    });

    return suite;
}
