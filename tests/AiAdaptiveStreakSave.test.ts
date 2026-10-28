/**
 * AiAdaptiveStreakSave.test.ts — 連勝連敗計數的存讀檔流程（AIS-11 / PROG-2-1326 後續）
 *
 * 鎖住：正式戰鬥結算後計數寫進存檔；讀回後計數接續；平手歸零；
 * 舊存檔沒有 aiAdaptiveStreak 欄位時讀回為 0；計數為 0 時不寫入欄位（版號不升）。
 *
 * Unity 對照：像把 Difficulty Director 的勝負紀錄存進 PlayerPrefs，下次開遊戲時接著累計，而不是從零開始。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService, type PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';

function makeSession(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.4);
    return session;
}

export function createAiAdaptiveStreakSaveSuite(): TestSuite {
    const suite = new TestSuite('AiAdaptiveStreakSave (連勝連敗存讀檔 AIS-11)');

    suite.test('新遊戲的連勝連敗為 0，存檔不寫入欄位', () => {
        const session = makeSession(new MemoryStorageAdapter());
        assert.equals(0, session.aiAdaptiveStreak.consecutiveWins);
        assert.isTrue(session.createSnapshot(new Date(0)).aiAdaptiveStreak === undefined);
    });

    suite.test('連續三場勝利後存檔，讀回計數仍為 3，且可再接續累加', async () => {
        const adapter = new MemoryStorageAdapter();
        const first = makeSession(adapter);
        for (let i = 0; i < 3; i += 1) await first.recordBattle([], 'player-win');
        await first.save();

        const second = makeSession(adapter);
        assert.isTrue(await second.load());
        assert.equals(3, second.aiAdaptiveStreak.consecutiveWins);
        assert.equals(0, second.aiAdaptiveStreak.consecutiveLosses);

        await second.recordBattle([], 'player-win');
        assert.equals(4, second.aiAdaptiveStreak.consecutiveWins);
    });

    suite.test('連敗計數存檔讀回；平手歸零後存檔不再帶欄位', async () => {
        const adapter = new MemoryStorageAdapter();
        const first = makeSession(adapter);
        await first.recordBattle([], 'enemy-win');
        await first.recordBattle([], 'enemy-win');
        await first.save();

        const second = makeSession(adapter);
        await second.load();
        assert.equals(2, second.aiAdaptiveStreak.consecutiveLosses);

        await second.recordBattle([], 'draw');
        assert.equals(0, second.aiAdaptiveStreak.consecutiveLosses);
        assert.isTrue(second.createSnapshot(new Date(0)).aiAdaptiveStreak === undefined);
    });

    suite.test('舊存檔沒有 aiAdaptiveStreak 欄位，讀回為 0', async () => {
        const adapter = new MemoryStorageAdapter();
        const first = makeSession(adapter);
        await first.recordBattle([], 'player-win');
        await first.save();
        // 模擬舊存檔：把欄位拿掉再寫回
        const raw = await new PlayerSaveService(adapter).load();
        assert.isTrue(raw !== null);
        const legacy: PlayerSaveSnapshot = { ...raw!, aiAdaptiveStreak: undefined };
        await new PlayerSaveService(adapter).save(legacy);

        const second = makeSession(adapter);
        await second.load();
        assert.equals(0, second.aiAdaptiveStreak.consecutiveWins);
        assert.equals(0, second.aiAdaptiveStreak.consecutiveLosses);
    });

    return suite;
}
