/**
 * FirstBattleCleared.test.ts — 「首戰已通過」存檔旗標（PROG-2-0647）
 *
 * Unity 對照：像 PlayerPrefs 的 "FirstBattleDone"，第一次勝利才寫入，舊存檔用既有紀錄推算。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GameSession, GAME_SESSION_EVENTS, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';

const generals = JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/data/generals.json'), 'utf8')) as GeneralConfig[];

async function freshSession(adapter = new MemoryStorageAdapter()): Promise<GameSession> {
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.99);
    await session.startNewGameWithStarters(1, generals);
    return session;
}

export function createFirstBattleClearedSuite(): TestSuite {
    const suite = new TestSuite('FirstBattleCleared (首戰已通過旗標)');

    suite.test('新局為 false；打輸或未結束不會設旗標', async () => {
        const session = await freshSession();
        assert.isFalse(session.firstBattleCleared);
        await session.recordBattle(['zhang-fei'], 'enemy-win');
        assert.isFalse(session.firstBattleCleared);
    });

    suite.test('第一次勝利設旗標並只發一次事件，之後勝利不重發', async () => {
        const session = await freshSession();
        let fired = 0;
        session.setEventEmitter({ emit: (name) => { if (name === GAME_SESSION_EVENTS.FirstBattleCleared) fired++; } });
        await session.recordBattle(['zhang-fei'], 'player-win');
        assert.isTrue(session.firstBattleCleared);
        await session.recordBattle(['zhang-fei'], 'player-win');
        assert.equals(1, fired);
    });

    suite.test('旗標存檔後讀回仍為 true；新局重置為 false', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await freshSession(adapter);
        await session.recordBattle(['zhang-fei'], 'player-win');
        await session.save();
        const restored = new GameSession(3);
        restored.setRosterStore(new InMemoryRosterStore([]));
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());
        assert.isTrue(restored.firstBattleCleared);
        restored.startNewGame(2);
        assert.isFalse(restored.firstBattleCleared);
    });

    suite.test('舊檔沒有旗標：有通關紀錄推算為 true，沒有為 false', async () => {
        for (const cleared of [true, false]) {
            const adapter = new MemoryStorageAdapter();
            const session = await freshSession(adapter);
            await session.recordBattle(['zhang-fei'], 'player-win', cleared ? { stageId: 'stage-1' } : {});
            const snapshot = session.createSnapshot();
            const old = JSON.parse(JSON.stringify(snapshot));
            delete old.resources.firstBattleCleared;
            if (!cleared) old.clearedStageIds = [];
            const oldAdapter = new MemoryStorageAdapter();
            const oldSave = new PlayerSaveService(oldAdapter);
            await oldSave.save(old);
            const restored = new GameSession(3);
            restored.setRosterStore(new InMemoryRosterStore([]));
            restored.setSaveService(oldSave);
            assert.isTrue(await restored.load());
            assert.equals(cleared, restored.firstBattleCleared);
        }
    });

    suite.test('第四幕紅顏：首戰通過後該彈一次，標記後存檔讀回不再彈；舊檔老玩家不補彈', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await freshSession(adapter);
        assert.isFalse(session.shouldShowOpeningRedFace);
        await session.recordBattle(['zhang-fei'], 'player-win');
        assert.isTrue(session.shouldShowOpeningRedFace);
        await session.markOpeningRedFaceShown();
        assert.isFalse(session.shouldShowOpeningRedFace);
        const restored = new GameSession(3);
        restored.setRosterStore(new InMemoryRosterStore([]));
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());
        assert.isTrue(restored.firstBattleCleared);
        assert.isFalse(restored.shouldShowOpeningRedFace);

        const veteran = await freshSession();
        await veteran.recordBattle(['zhang-fei'], 'player-win', { stageId: 'stage-1' });
        const old = JSON.parse(JSON.stringify(veteran.createSnapshot()));
        delete old.resources.firstBattleCleared;
        delete old.resources.openingRedFaceShown;
        const oldSave = new PlayerSaveService(new MemoryStorageAdapter());
        await oldSave.save(old);
        const loaded = new GameSession(3);
        loaded.setRosterStore(new InMemoryRosterStore([]));
        loaded.setSaveService(oldSave);
        assert.isTrue(await loaded.load());
        assert.isTrue(loaded.firstBattleCleared);
        assert.isFalse(loaded.shouldShowOpeningRedFace);
    });

    return suite;
}
