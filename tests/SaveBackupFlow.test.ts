/**
 * SaveBackupFlow.test.ts — 存檔備份在真實 GameSession 流程的壞檔情境（QA，PROG-2-0639）
 *
 * Unity 對照：像把 .bak 機制放進完整遊戲流程測——主檔被改壞、寫到一半斷電、備份比主檔舊，玩家讀檔看到什麼。
 */
import { TestSuite, assert } from './TestRunner';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService, PLAYER_SAVE_KEY, PLAYER_SAVE_BACKUP_SUFFIX } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const BACKUP_KEY = `${PLAYER_SAVE_KEY}${PLAYER_SAVE_BACKUP_SUFFIX}`;

function person(id: string): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, vitality: 100, maxVitality: 100, maxLifespan: 120,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, careerClass: 'Warrior', role: 'Combat',
    } as unknown as GeneralConfig;
}

function newSession(adapter: MemoryStorageAdapter, emitted: string[] = []): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([person('a')]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.99);
    session.setAutoSave(false); // 存檔次數由測試手動控制，備份槽內容才可預期
    session.setEventEmitter({ emit: (name) => emitted.push(name) });
    return session;
}

/** 寫入主檔時失敗的後端（模擬寫到一半斷電）；備份槽照常寫 */
class FlakyAdapter extends MemoryStorageAdapter {
    public failMainWrites = false;
    async set<T>(key: string, value: T): Promise<void> {
        if (this.failMainWrites && key === PLAYER_SAVE_KEY) throw new Error('write interrupted');
        return super.set(key, value);
    }
}

export function createSaveBackupFlowSuite(): TestSuite {
    const suite = new TestSuite('SaveBackupFlow (存檔備份 × 真實流程壞檔情境)');

    suite.test('主檔壞、備份好：讀回上一份進度，並發出「從備份讀回」事件', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter);
        await a.advanceSeason();
        await a.save();
        await a.advanceSeason();
        await a.save();
        await adapter.set(PLAYER_SAVE_KEY, { broken: true });

        const emitted: string[] = [];
        const b = newSession(adapter, emitted);
        assert.isTrue(await b.load());
        assert.equals(1, b.gameTime.totalSeasonsElapsed, '退回上一份（第 1 季）');
        assert.isTrue(emitted.includes(GAME_SESSION_EVENTS.LoadRecoveredFromBackup));
    });

    suite.test('正常讀檔：不發「從備份讀回」事件', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter);
        await a.save();
        await a.save();
        const emitted: string[] = [];
        const b = newSession(adapter, emitted);
        assert.isTrue(await b.load());
        assert.isFalse(emitted.includes(GAME_SESSION_EVENTS.LoadRecoveredFromBackup));
    });

    suite.test('主檔與備份都壞：load 拋錯，不留下半套狀態', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter);
        await a.save();
        await a.save();
        await adapter.set(PLAYER_SAVE_KEY, { broken: true });
        await adapter.set(BACKUP_KEY, { alsoBroken: true });
        const b = newSession(adapter);
        let threw = false;
        try { await b.load(); } catch { threw = true; }
        assert.isTrue(threw);
        assert.equals(0, b.gameTime.totalSeasonsElapsed);
    });

    suite.test('寫主檔中途失敗：主檔仍是上一份有效存檔，備份不被壞資料污染', async () => {
        const adapter = new FlakyAdapter();
        const a = newSession(adapter);
        await a.advanceSeason();
        await a.save();
        await a.advanceSeason();
        adapter.failMainWrites = true;
        let threw = false;
        try { await a.save(); } catch { threw = true; }
        assert.isTrue(threw);
        adapter.failMainWrites = false;

        const emitted: string[] = [];
        const b = newSession(adapter, emitted);
        assert.isTrue(await b.load());
        assert.equals(1, b.gameTime.totalSeasonsElapsed, '主檔還是中斷前最後一次成功的存檔');
        assert.isFalse(emitted.includes(GAME_SESSION_EVENTS.LoadRecoveredFromBackup));
    });

    suite.test('從備份讀回後繼續玩並存檔：主檔恢復正常，再讀不再走備份', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter);
        await a.advanceSeason();
        await a.save();
        await a.advanceSeason();
        await a.save();
        await adapter.set(PLAYER_SAVE_KEY, { broken: true });

        const b = newSession(adapter);
        assert.isTrue(await b.load());
        await b.advanceSeason();
        await b.save();

        const emitted: string[] = [];
        const c = newSession(adapter, emitted);
        assert.isTrue(await c.load());
        assert.equals(2, c.gameTime.totalSeasonsElapsed);
        assert.isFalse(emitted.includes(GAME_SESSION_EVENTS.LoadRecoveredFromBackup));
    });

    suite.test('清除存檔（新遊戲）：主檔與備份都不留，讀檔回傳 false', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter);
        await a.save();
        await a.save();
        await new PlayerSaveService(adapter).clear();
        assert.equals(null, await adapter.get(PLAYER_SAVE_KEY));
        assert.equals(null, await adapter.get(BACKUP_KEY));
        assert.isFalse(await newSession(adapter).load());
    });

    return suite;
}
