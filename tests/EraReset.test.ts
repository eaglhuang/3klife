/**
 * 時代更迭 Era_Reset（TIME-10 / PROG-2-0813）
 *
 * 鎖住：每 60 月（20 季）才觸發、開局不算、事件資料的保留/重置清單，
 * 以及 GameSession 季結後在更迭季發出 EraReset 事件。
 */
import { assert, TestSuite } from './TestRunner';
import { GAME_SESSION_EVENTS, GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { ERA_RESET_KEEP, ERA_RESET_RESET, buildEraResetEvent, isEraResetSeason } from '../assets/scripts/core/systems/EraReset';

function createSession(): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([] as never));
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    session.setRandomSource(() => 0);
    return session;
}

export function createEraResetSuite(): TestSuite {
    const suite = new TestSuite('EraReset (時代更迭 TIME-10)');

    suite.test('觸發季：每 20 季（60 月）一次，開局與其他季不觸發', () => {
        assert.isFalse(isEraResetSeason(0));
        assert.isFalse(isEraResetSeason(19));
        assert.isTrue(isEraResetSeason(20));
        assert.isFalse(isEraResetSeason(21));
        assert.isTrue(isEraResetSeason(40));
        assert.isFalse(isEraResetSeason(1.5));
    });

    suite.test('事件資料：第一次為第 1 個時代，保留養成、重置地圖', () => {
        assert.isTrue(buildEraResetEvent(19) === null);
        const event = buildEraResetEvent(20);
        assert.equals(1, event?.eraIndex ?? -1);
        assert.equals(20, event?.atSeason ?? -1);
        assert.equals(2, buildEraResetEvent(40)?.eraIndex ?? -1);
        assert.isTrue(ERA_RESET_KEEP.includes('bloodlineFactors'));
        assert.isTrue(ERA_RESET_KEEP.includes('tigerTallyAndSpiritCards'));
        assert.isTrue(ERA_RESET_RESET.includes('territoryOwnership'));
        assert.isTrue(ERA_RESET_RESET.includes('diplomacy'));
        assert.isTrue(ERA_RESET_RESET.includes('aiNationScale'));
        // 保留與重置不可重疊
        assert.equals(0, ERA_RESET_KEEP.filter(k => ERA_RESET_RESET.includes(k)).length);
    });

    suite.test('GameSession：第 20 季結束時發出 EraReset，前面的季不發', async () => {
        const session = createSession();
        const emitted: Array<{ name: string; payload: unknown }> = [];
        session.setEventEmitter({ emit: (name: string, payload: unknown) => emitted.push({ name, payload }) });
        for (let i = 0; i < 19; i++) await session.advanceSeason();
        assert.isFalse(emitted.some(e => e.name === GAME_SESSION_EVENTS.EraReset));
        await session.advanceSeason();
        const hits = emitted.filter(e => e.name === GAME_SESSION_EVENTS.EraReset);
        assert.equals(1, hits.length);
        assert.equals(1, (hits[0].payload as { eraIndex: number }).eraIndex);
    });

    return suite;
}
