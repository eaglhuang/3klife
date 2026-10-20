/**
 * StageProgressSave — 通關進度存檔欄位（連環破，PROG-2-0215）的 headless 測試
 *
 * 重點：舊存檔（沒有 clearedStageIds）要能載入並補空陣列；勝利才記通關；敗北不記。
 */
import { TestSuite, assert } from './TestRunner';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import {
    PLAYER_SAVE_KEY,
    PlayerSaveService,
    createPlayerSaveSnapshot,
    normalizeClearedStageIds,
    validatePlayerSaveSnapshot,
} from '../assets/scripts/core/services/PlayerSaveService';
import { createInitialGameTimeState } from '../assets/scripts/core/systems/GameClock';

function createSession(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.99);
    return session;
}

export function createStageProgressSaveSuite(): TestSuite {
    const suite = new TestSuite('StageProgressSave (通關進度存檔 PROG-2-0215)');

    suite.test('normalizeClearedStageIds：非陣列視為沒有紀錄，過濾空字串與重複', () => {
        assert.equals(0, normalizeClearedStageIds(undefined).length);
        assert.equals(0, normalizeClearedStageIds('encounter-001').length);
        assert.equals(2, normalizeClearedStageIds(['encounter-001', '', 'encounter-001', 'encounter-002', 42]).length);
        assert.equals('encounter-002', normalizeClearedStageIds(['encounter-001', 'encounter-002'])[1]);
    });

    suite.test('createPlayerSaveSnapshot：預設寫入空通關紀錄，並保留傳入順序', () => {
        const empty = createPlayerSaveSnapshot(createInitialGameTimeState(), []);
        assert.equals(0, empty.clearedStageIds?.length ?? -1);
        const filled = createPlayerSaveSnapshot(createInitialGameTimeState(), [], new Date(0), undefined, [], null, 1, undefined, 0, undefined, 0, ['encounter-001']);
        assert.equals('encounter-001', filled.clearedStageIds?.[0] ?? '');
    });

    suite.test('舊存檔（沒有 clearedStageIds 欄位）仍可載入，通關紀錄補空陣列', async () => {
        const adapter = new MemoryStorageAdapter();
        const service = new PlayerSaveService(adapter);
        const legacy = {
            schemaVersion: 1,
            savedAt: '2026-10-01T00:00:00.000Z',
            gameTime: createInitialGameTimeState(),
            roster: [],
        };
        await adapter.set(PLAYER_SAVE_KEY, legacy);
        const loaded = await service.load();
        assert.isTrue(loaded !== null, '舊存檔應可載入');
        assert.equals(0, loaded?.clearedStageIds?.length ?? -1, '舊存檔應補空通關紀錄');
    });

    suite.test('通關紀錄存檔後可完整讀回（round trip）', async () => {
        const adapter = new MemoryStorageAdapter();
        const service = new PlayerSaveService(adapter);
        await service.save(createPlayerSaveSnapshot(createInitialGameTimeState(), [], new Date(0), undefined, [], null, 1, undefined, 0, undefined, 0, ['encounter-001', 'encounter-002']));
        const loaded = await service.load();
        assert.equals(2, loaded?.clearedStageIds?.length ?? 0);
        assert.equals('encounter-002', loaded?.clearedStageIds?.[1] ?? '');
    });

    suite.test('clearedStageIds 不是陣列的存檔會拋錯，不會被當成新遊戲覆蓋', () => {
        assert.throws(() => validatePlayerSaveSnapshot({
            schemaVersion: 1,
            savedAt: 'x',
            gameTime: createInitialGameTimeState(),
            roster: [],
            clearedStageIds: 'encounter-001',
        }));
    });

    suite.test('勝利時記入通關紀錄並存檔；同一關重複勝利不重複記入', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = createSession(adapter);
        await session.recordBattle([], 'player-win', { stageId: 'encounter-001' });
        await session.recordBattle([], 'player-win', { stageId: 'encounter-001' });
        assert.equals(1, session.clearedStageIds.length);

        const reopened = createSession(adapter);
        assert.isTrue(await reopened.load(), '勝利後應寫入自動存檔');
        assert.equals('encounter-001', reopened.clearedStageIds[0] ?? '');
    });

    suite.test('敗北或沒有 stageId 時不記通關紀錄', async () => {
        const session = createSession(new MemoryStorageAdapter());
        await session.recordBattle([], 'enemy-win', { stageId: 'encounter-001' });
        await session.recordBattle([], 'player-win');
        assert.equals(0, session.clearedStageIds.length);
    });

    suite.test('新遊戲會清空通關紀錄', async () => {
        const session = createSession(new MemoryStorageAdapter());
        await session.recordBattle([], 'player-win', { stageId: 'encounter-001' });
        session.startNewGame(1);
        assert.equals(0, session.clearedStageIds.length);
    });

    return suite;
}
