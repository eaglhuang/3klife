/**
 * TigerTallyBattleSettlement — 戰後把戰鬥經驗寫回出陣虎符卡片實例（TRP-10 接線，PROG-2-0573）的整合測試
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';

async function sessionWithCards(cards: Array<Record<string, unknown>>): Promise<GameSession> {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    await session.load();
    await session.registerTallyCards(cards as never);
    return session;
}

export function createTigerTallyBattleSettlementSuite(): TestSuite {
    const suite = new TestSuite('TigerTallyBattleSettlement (戰後虎符經驗寫回 TRP-10)');

    suite.test('勝利：出陣虎符累積勝利經驗 15，90 經驗的 SSR 升到 2★', async () => {
        const session = await sessionWithCards([
            { uid: 't1', templateId: 'tpl', sourceGeneralUid: 'g', quality: 'SSR', score: 0, source: 'death', producedSeason: 0, stars: 1, battleExp: 90 },
        ]);
        await session.recordBattle([], 'player-win', { deployedTallyIds: ['t1'] });
        assert.equals(2, session.tallyCards['t1'].stars ?? 0);
        assert.equals(105, session.tallyCards['t1'].battleExp ?? 0);
    });

    suite.test('未出陣的虎符不受影響', async () => {
        const session = await sessionWithCards([
            { uid: 't1', templateId: 'tpl', sourceGeneralUid: 'g', quality: 'SSR', score: 0, source: 'death', producedSeason: 0 },
            { uid: 't2', templateId: 'tpl', sourceGeneralUid: 'g', quality: 'SSR', score: 0, source: 'death', producedSeason: 0 },
        ]);
        await session.recordBattle([], 'player-win', { deployedTallyIds: ['t1'] });
        assert.equals(0, session.tallyCards['t2'].battleExp ?? 0);
    });

    suite.test('進行中（ongoing）的戰鬥不結算經驗', async () => {
        const session = await sessionWithCards([
            { uid: 't1', templateId: 'tpl', sourceGeneralUid: 'g', quality: 'SSR', score: 0, source: 'death', producedSeason: 0 },
        ]);
        await session.recordBattle([], 'ongoing', { deployedTallyIds: ['t1'] });
        assert.equals(0, session.tallyCards['t1'].battleExp ?? 0);
    });

    suite.test('R 虎符經驗夠多也不超過 3★', async () => {
        const session = await sessionWithCards([
            { uid: 't1', templateId: 'tpl', sourceGeneralUid: 'g', quality: 'R', score: 0, source: 'death', producedSeason: 0, stars: 3, battleExp: 340 },
        ]);
        await session.recordBattle([], 'player-win', { deployedTallyIds: ['t1'] });
        assert.equals(3, session.tallyCards['t1'].stars ?? 0);
    });

    return suite;
}
