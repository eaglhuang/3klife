/**
 * OfficerSaveWire — 官職狀態存檔接線（OFC-03）的 headless 測試
 *
 * 鎖住：官職經驗存檔後可完整讀回；舊存檔（沒有 officerState）讀回為階位 1；
 * 新遊戲會重置官職；存檔版號不升（扁平欄位）。
 */
import { TestSuite, assert } from './TestRunner';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import {
    PLAYER_SAVE_KEY,
    PlayerSaveService,
    createPlayerSaveSnapshot,
    validatePlayerSaveSnapshot,
} from '../assets/scripts/core/services/PlayerSaveService';
import { createInitialGameTimeState } from '../assets/scripts/core/systems/GameClock';
import { initialOfficerState, normalizeOfficerState } from '../assets/scripts/core/systems/OfficerState';
import { SAVE_VERSION_LATEST } from '../assets/scripts/core/storage/SaveVersion';

const HELL_MILITARY_WIN = { difficulty: 'HELL' as const, boardType: 'MILITARY' as const, success: true };

function createSession(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.99);
    return session;
}

export function createOfficerSaveWireSuite(): TestSuite {
    const suite = new TestSuite('OfficerSaveWire (官職存檔接線 OFC-03)');

    suite.test('預設官職狀態不寫入存檔欄位（舊存檔格式不變）', () => {
        const snapshot = createPlayerSaveSnapshot(createInitialGameTimeState(), []);
        assert.isTrue(snapshot.officerState === undefined);
    });

    suite.test('存檔版號不升：官職欄位仍使用目前的 schemaVersion 與 saveVersion', () => {
        const snapshot = createPlayerSaveSnapshot(createInitialGameTimeState(), [], new Date(0), undefined, [], null, 1, undefined, 0, undefined, 0, [], {}, {}, {}, undefined, {}, {}, null, [], {}, [], 0, { currentTier: 2, officerExp: 120, unlockHistory: [1, 2] });
        assert.equals(SAVE_VERSION_LATEST, snapshot.saveVersion ?? '');
        assert.equals(2, snapshot.officerState?.currentTier ?? -1);
    });

    suite.test('官職經驗存檔後可完整讀回（round trip）', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = createSession(adapter);
        session.gainOfficerExp(HELL_MILITARY_WIN);
        session.gainOfficerExp(HELL_MILITARY_WIN);
        await session.save();

        const reloaded = createSession(adapter);
        assert.isTrue(await reloaded.load());
        assert.equals(2, reloaded.officerState.currentTier);
        assert.equals(158, reloaded.officerState.officerExp);
        assert.equals(2, reloaded.officerUnlocks.tier);
        assert.equals(2, reloaded.officerState.unlockHistory.length);
    });

    suite.test('舊存檔（沒有 officerState）讀回為階位 1', async () => {
        const adapter = new MemoryStorageAdapter();
        await adapter.set(PLAYER_SAVE_KEY, {
            schemaVersion: 1,
            savedAt: '2026-10-01T00:00:00.000Z',
            gameTime: createInitialGameTimeState(),
            roster: [],
        });
        const session = createSession(adapter);
        assert.isTrue(await session.load());
        assert.equals(1, session.officerState.currentTier);
        assert.equals(0, session.officerState.officerExp);
    });

    suite.test('讀回壞值的官職欄位會退回階位 1，且不擋住存檔載入', () => {
        const restored = normalizeOfficerState({ currentTier: 'x', officerExp: -5, unlockHistory: 'bad' });
        assert.equals(1, restored.currentTier);
        assert.equals(0, restored.officerExp);
        assert.equals(1, restored.unlockHistory.length);
        const snapshot = validatePlayerSaveSnapshot({
            schemaVersion: 1,
            savedAt: 'x',
            gameTime: createInitialGameTimeState(),
            roster: [],
            officerState: { currentTier: 'x' },
        });
        assert.equals(1, snapshot.officerState?.currentTier ?? -1);
    });

    suite.test('新遊戲會把官職重置為初始狀態', () => {
        const session = createSession(new MemoryStorageAdapter());
        session.gainOfficerExp(HELL_MILITARY_WIN);
        session.gainOfficerExp(HELL_MILITARY_WIN);
        assert.equals(2, session.officerState.currentTier);
        session.startNewGame();
        assert.equals(initialOfficerState().currentTier, session.officerState.currentTier);
        assert.equals(0, session.officerState.officerExp);
    });

    return suite;
}
