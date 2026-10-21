/**
 * SandtableSaveWiring.test.ts — 世界沙盤標記放置、上限與存讀檔 headless 測試（PROG-2-0958）
 *
 * Unity 對照：PlayMode 測試，在沙盤上插旗、存檔、換場景讀檔，確認旗子數與剩餘名額不跑掉。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';

const HELL_MILITARY_WIN = { difficulty: 'HELL' as const, boardType: 'MILITARY' as const, success: true };

function createSession(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.99);
    return session;
}

/** 四場 HELL 勝利 = 316 經驗（每場 79），升到階位 3（郡守，開放 S1 沙盤） */
function promoteToTierThree(session: GameSession): void {
    for (let i = 0; i < 4; i++) session.gainOfficerExp(HELL_MILITARY_WIN);
}

export function createSandtableSaveWiringSuite(): TestSuite {
    const suite = new TestSuite('SandtableSaveWiring');

    suite.test('未解鎖沙盤時不能放標記，剩餘數為 0', () => {
        const session = createSession(new MemoryStorageAdapter());
        assert.equals(0, session.sandtableRemaining);
        assert.isFalse(session.placeSandtableMarker());
        assert.equals(0, session.sandtableMarkersPlaced);
    });

    suite.test('階位 3 開放 S1，上限 3 個，放滿後第 4 次失敗且不改狀態', () => {
        const session = createSession(new MemoryStorageAdapter());
        promoteToTierThree(session);
        assert.equals(3, session.sandtableRemaining);
        assert.isTrue(session.placeSandtableMarker());
        assert.isTrue(session.placeSandtableMarker());
        assert.isTrue(session.placeSandtableMarker());
        assert.isFalse(session.placeSandtableMarker());
        assert.equals(3, session.sandtableMarkersPlaced);
        assert.equals(0, session.sandtableRemaining);
    });

    suite.test('標記數量存讀檔後保留，剩餘名額依目前階段重算', async () => {
        const adapter = new MemoryStorageAdapter();
        let session = createSession(adapter);
        promoteToTierThree(session);
        session.placeSandtableMarker();
        session.placeSandtableMarker();
        await session.save();

        session = createSession(adapter);
        assert.isTrue(await session.load());
        assert.equals(2, session.sandtableMarkersPlaced);
        assert.equals(1, session.sandtableRemaining);
    });

    suite.test('沒有放置過標記時不寫入欄位（舊存檔相容，版號不升）', () => {
        const session = createSession(new MemoryStorageAdapter());
        const snapshot = JSON.parse(JSON.stringify(session.createSnapshot(new Date(0)))) as Record<string, unknown>;
        assert.isFalse('sandtableMarkersPlaced' in snapshot);
    });

    return suite;
}
