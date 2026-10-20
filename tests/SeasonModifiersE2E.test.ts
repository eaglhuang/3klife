/**
 * SeasonModifiersE2E.test.ts — 四季修正端到端（QA，PROG-2-0815）
 *
 * Unity 對照：像 PlayMode 測試，真的推進四季，看糧草、趕路、受孕率有沒有在對的季節生效。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { FOOD_PER_SEASON } from '../assets/scripts/core/systems/MilitaryReserve';
import { DEFAULT_SEASON_MODIFIERS, setActiveSeasonModifiers } from '../assets/scripts/core/systems/SeasonModifiers';

/** 糧草歸零的新局（先存檔、改糧草、再讀回），讓每季補給有空間不被上限夾住 */
async function newSession(): Promise<GameSession> {
    const storage = new MemoryStorageAdapter();
    const service = new PlayerSaveService(storage);
    const seed = new GameSession();
    seed.setRosterStore(new InMemoryRosterStore([]));
    seed.setSaveService(service);
    const snapshot = await seed.save();
    await service.save({ ...snapshot, military: { ...seed.military, food: 0 } });
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(service);
    session.setRandomSource(() => 0);
    assert.isTrue(await session.load());
    assert.equals(0, session.military.food);
    return session;
}

/** 推進一季，回傳這一季糧草增量 */
async function foodGainOfNextSeason(session: GameSession): Promise<number> {
    const before = session.military.food;
    await session.advanceSeason();
    return session.military.food - before;
}

export function createSeasonModifiersE2ESuite(): TestSuite {
    const suite = new TestSuite('SeasonModifiersE2E (四季修正端到端)');

    suite.test('糧草：春→夏、夏→秋照舊；秋→冬（秋季結束）才 ×1.5', async () => {
        setActiveSeasonModifiers(DEFAULT_SEASON_MODIFIERS);
        const session = await newSession();
        const gains: number[] = [];
        for (let i = 0; i < 3; i++) gains.push(await foodGainOfNextSeason(session));
        assert.equals(FOOD_PER_SEASON, gains[0]);
        assert.equals(FOOD_PER_SEASON, gains[1]);
        assert.equals(Math.floor(FOOD_PER_SEASON * 1.5), gains[2]);
    });

    suite.test('趕路：冬季出發多 1 回合，春季不變', async () => {
        setActiveSeasonModifiers(DEFAULT_SEASON_MODIFIERS);
        const session = await newSession();
        session.startTravel('city-a', 3);
        assert.equals(3, session.travel!.remainingTurns);
        for (let i = 0; i < 3; i++) await session.advanceSeason();
        session.startTravel('city-a', 3);
        assert.equals(4, session.travel!.remainingTurns);
    });

    return suite;
}
