/**
 * MentorDuplicateSession.test.ts — 教官卡重複抽中在 GameSession 的判定與入帳（MENT-07，PROG-2-0867）
 *
 * Unity 對照：像 EditMode 測試，直接對 Command 呼叫一次「重複抽中」，
 * 驗突破不入帳、溢出才加積分，並確認點數寫進存檔。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';

function sessionWith(storage = new MemoryStorageAdapter()): GameSession {
    const session = new GameSession(3);
    session.setSaveService(new PlayerSaveService(storage));
    return session;
}

export function createMentorDuplicateSessionSuite(): TestSuite {
    const suite = new TestSuite('MentorDuplicateSession (教官重複抽中入帳)');

    suite.test('未滿 ★5 重複抽中：突破、不入帳、沒有溢出提示', async () => {
        const session = sessionWith();
        const outcome = await session.resolveMentorDuplicateCard(2, 'SSR', '諸葛亮');
        assert.equals('breakthrough', outcome.result.kind);
        assert.equals(3, outcome.result.star);
        assert.equals(0, outcome.scoreGain);
        assert.equals(0, session.scorePoints);
        assert.equals(null, outcome.toast);
    });

    suite.test('已滿 ★5 重複抽中（SSR）：溢出入帳 500 點，回傳溢出提示', async () => {
        const session = sessionWith();
        const outcome = await session.resolveMentorDuplicateCard(5, 'SSR', '諸葛亮');
        assert.equals('overflow', outcome.result.kind);
        assert.equals(500, outcome.scoreGain);
        assert.equals(500, session.scorePoints);
        assert.equals('諸葛亮 已滿突破，轉化為積分×500', outcome.toast ?? '');
    });

    suite.test('多次溢出累積點數：R 20 + SR 100 = 120', async () => {
        const session = sessionWith();
        await session.resolveMentorDuplicateCard(5, 'R', '甲');
        await session.resolveMentorDuplicateCard(5, 'SR', '乙');
        assert.equals(120, session.scorePoints);
    });

    suite.test('未知稀有度溢出：不入帳（由上游資料把關）', async () => {
        const session = sessionWith();
        const outcome = await session.resolveMentorDuplicateCard(5, 'UNKNOWN', '丙');
        assert.equals('overflow', outcome.result.kind);
        assert.equals(0, session.scorePoints);
    });

    suite.test('溢出點數跨存檔保留', async () => {
        const storage = new MemoryStorageAdapter();
        const first = sessionWith(storage);
        await first.resolveMentorDuplicateCard(5, 'SR', '乙');
        const second = sessionWith(storage);
        assert.isTrue(await second.load());
        assert.equals(100, second.scorePoints);
    });

    return suite;
}
