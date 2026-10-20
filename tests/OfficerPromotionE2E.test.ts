/**
 * OfficerPromotionE2E — 官職晉升 × 存讀檔端到端（QA，PROG-2-0622）
 *
 * Unity 對照：像 PlayMode 測試，每打一場任務就存檔、換一個新 session 讀檔再繼續，
 * 看晉升事件會不會漏報或重複報、大廳任務牆拿到的階位對不對。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { hallPlayerOf } from '../assets/scripts/core/systems/OfficerSnapshot';

const HELL_MILITARY_WIN = { difficulty: 'HELL' as const, boardType: 'MILITARY' as const, success: true };
const HELL_MILITARY_LOSS = { difficulty: 'HELL' as const, boardType: 'MILITARY' as const, success: false };

function createSession(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.99);
    return session;
}

export function createOfficerPromotionE2ESuite(): TestSuite {
    const suite = new TestSuite('OfficerPromotionE2E (官職晉升 × 存讀檔)');

    suite.test('每場任務後存檔再讀檔：晉升各只回報一次，解鎖歷史逐階累積', async () => {
        const adapter = new MemoryStorageAdapter();
        let session = createSession(adapter);
        const promotions: number[][] = [];
        // 79 經驗 × 5：79、158（升 2）、237、316（升 3）、395
        for (let i = 0; i < 5; i++) {
            promotions.push(session.gainOfficerExp(HELL_MILITARY_WIN));
            await session.save();
            session = createSession(adapter);
            assert.isTrue(await session.load());
        }
        assert.equals(JSON.stringify([[], [2], [], [3], []]), JSON.stringify(promotions));
        assert.equals(3, session.officerState.currentTier);
        assert.equals(395, session.officerState.officerExp);
        assert.equals(JSON.stringify([1, 2, 3]), JSON.stringify(session.officerState.unlockHistory));
    });

    suite.test('讀檔後大廳任務牆的玩家狀態用存檔階位', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = createSession(adapter);
        for (let i = 0; i < 4; i++) a.gainOfficerExp(HELL_MILITARY_WIN);
        await a.save();

        const b = createSession(adapter);
        assert.isTrue(await b.load());
        const player = hallPlayerOf(b.officerUnlocks);
        assert.equals(3, player.rankTier);
        assert.equals(hallPlayerOf(a.officerUnlocks).worldStage, player.worldStage);
    });

    suite.test('任務失敗只拿 40% 經驗，存讀檔後數字不變', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = createSession(adapter);
        a.gainOfficerExp(HELL_MILITARY_LOSS);
        await a.save();
        const b = createSession(adapter);
        assert.isTrue(await b.load());
        assert.equals(31, b.officerState.officerExp);
        assert.equals(1, b.officerState.currentTier);
    });

    return suite;
}
