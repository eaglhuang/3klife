import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { normalizeFavoriteGeneralIds, normalizeHallAssignments } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string): GeneralConfig {
    return { id, name: id } as unknown as GeneralConfig;
}

function sessionWith(ids: string[], adapter = new MemoryStorageAdapter()): Promise<GameSession> {
    return (async () => {
        const session = new GameSession(1);
        session.setSaveService(new PlayerSaveService(adapter));
        await session.addGenerals(ids.map(general));
        return session;
    })();
}

export function createGameSessionFavoriteHallSuite(): TestSuite {
    const suite = new TestSuite('GameSessionFavoriteHall (PROG-2-0453 收藏與大廳指派)');

    suite.test('收藏切換：第一次加入、第二次取消，名冊外武將不變更', async () => {
        const session = await sessionWith(['a', 'b']);
        const added = await session.toggleFavorite('a');
        assert.equals(true, added.ok);
        assert.equals(true, added.favorite);
        assert.equals(1, session.favoriteGeneralIds.length);
        const removed = await session.toggleFavorite('a');
        assert.equals(false, removed.favorite);
        assert.equals(0, session.favoriteGeneralIds.length);
        const missing = await session.toggleFavorite('ghost');
        assert.equals(false, missing.ok);
        assert.equals(0, session.favoriteGeneralIds.length);
    });

    suite.test('大廳指派：指派名冊內武將，重派覆蓋，解除後不再計入', async () => {
        const session = await sessionWith(['a', 'b']);
        assert.equals(true, await session.assignHallTask('task-1', 'a'));
        assert.equals(true, await session.assignHallTask('task-1', 'b'));
        assert.equals('b', session.hallAssignments['task-1']);
        assert.equals(false, await session.assignHallTask('task-2', 'ghost'));
        assert.equals(true, await session.releaseHallTask('task-1'));
        assert.equals(false, await session.releaseHallTask('task-1'));
        assert.equals(0, Object.keys(session.hallAssignments).length);
    });

    suite.test('hallCandidates 由收藏與指派推導，只列名冊內武將', async () => {
        const session = await sessionWith(['a', 'b', 'c']);
        await session.toggleFavorite('a');
        await session.assignHallTask('task-1', 'b');
        const byId = new Map(session.hallCandidates().map(c => [c.id, c] as const));
        assert.equals(true, byId.get('a')!.favorite);
        assert.equals(false, byId.get('a')!.assigned);
        assert.equals(true, byId.get('b')!.assigned);
        assert.equals(false, byId.get('c')!.favorite || byId.get('c')!.assigned);
        assert.equals(3, byId.size);
    });

    suite.test('存檔讀回：收藏與指派跨存檔保留', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await sessionWith(['a', 'b'], adapter);
        await session.toggleFavorite('b');
        await session.assignHallTask('task-1', 'a');
        const snap = await session.save();
        assert.equals('b', snap.favoriteGeneralIds![0]);
        assert.equals('a', snap.hallAssignments!['task-1']);
        const restored = new GameSession(1);
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());
        assert.equals(1, restored.favoriteGeneralIds.length);
        assert.equals('a', restored.hallAssignments['task-1']);
    });

    suite.test('舊存檔沒有新欄位時讀回為空，不寫入空欄位', async () => {
        const session = await sessionWith(['a']);
        const snap = await session.save();
        assert.equals(undefined, snap.favoriteGeneralIds);
        assert.equals(undefined, snap.hallAssignments);
    });

    suite.test('normalizers 去除壞資料', () => {
        assert.equals(2, normalizeFavoriteGeneralIds(['a', 'a', '', 3, 'b']).length);
        assert.equals(0, normalizeFavoriteGeneralIds('a').length);
        const clean = normalizeHallAssignments({ t1: 'a', '': 'b', t2: 7, t3: '' });
        assert.equals('a', clean.t1);
        assert.equals(1, Object.keys(clean).length);
        assert.equals(0, Object.keys(normalizeHallAssignments(['x'])).length);
    });

    return suite;
}
