/**
 * PROG-2-1171：三國日報行為紀錄採集點（缺糧、退役、虎符升級、忠誠下降）
 */

import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { TALLY_SHORTAGE_FOOD_THRESHOLD } from '../assets/scripts/core/systems/SortieDeploy';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function person(id: string, age: number): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age, hp: 1000, vitality: 100, maxVitality: 100, maxLifespan: 120,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, careerClass: 'Warrior', role: 'Combat', status: 'alive',
    } as unknown as GeneralConfig;
}

async function build(roster: GeneralConfig[]): Promise<GameSession> {
    const adapter = new MemoryStorageAdapter();
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setLifecycle(new LegacyService(adapter));
    session.setRandomSource(() => 0.99);
    await session.load();
    return session;
}

function types(session: GameSession): string[] {
    return session.playerLogs.map((log) => log.type);
}

export function createGameSessionDailyNewsLogsSuite(): TestSuite {
    const suite = new TestSuite('GameSessionDailyNewsLogs (PROG-2-1171 日報採集點)');

    suite.test('虎符戰後升星記 TALLY_UPGRADE；沒升星不記', async () => {
        const session = await build([]);
        await session.registerTallyCards([
            { uid: 't1', templateId: 'tpl', sourceGeneralUid: 'g', quality: 'SSR', score: 0, source: 'death', producedSeason: 0, stars: 1, battleExp: 90 },
            { uid: 't2', templateId: 'tpl', sourceGeneralUid: 'g', quality: 'SSR', score: 0, source: 'death', producedSeason: 0, stars: 1, battleExp: 0 },
        ] as never);
        await session.recordBattle([], 'draw', { deployedTallyIds: ['t2'] });
        assert.isFalse(types(session).includes('TALLY_UPGRADE'));
        await session.recordBattle([], 'draw', { deployedTallyIds: ['t1'] });
        assert.isTrue(types(session).includes('TALLY_UPGRADE'));
    });

    suite.test('沒收虎符使忠誠下降，記 LOYALTY_DROP', async () => {
        const session = await build([person('liu', 30)]);
        await session.registerTallyCards([{ uid: 't1', templateId: 'tpl-t1', sourceGeneralUid: 'src', quality: 'SSR', score: 0, source: 'death', producedSeason: 1 }]);
        await session.equipTally('t1', 'liu');
        assert.isFalse(types(session).includes('LOYALTY_DROP'));
        await session.confiscateTally('liu');
        assert.isTrue(types(session).includes('LOYALTY_DROP'));
    });

    suite.test('換季時糧草低於門檻記 RESOURCE_LOW（糧草）', async () => {
        const session = await build([person('liu', 30)]);
        await session.advanceSeason();
        assert.isFalse(types(session).includes('RESOURCE_LOW'));
        await session.recordBattle(['liu'], 'draw', { sortie: { lostTroops: 0, foodSpent: session.military.food } });
        assert.isTrue(session.military.food < TALLY_SHORTAGE_FOOD_THRESHOLD);
        await session.advanceSeason();
        const low = session.playerLogs.find((log) => log.type === 'RESOURCE_LOW');
        assert.equals('糧草', low?.resource ?? '');
    });

    suite.test('退役記 GENERAL_RETIRE', async () => {
        const session = await build([person('elder', 70)]);
        await session.retireGeneral('elder');
        assert.isTrue(types(session).includes('GENERAL_RETIRE'));
    });

    return suite;
}
