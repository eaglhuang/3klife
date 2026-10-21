/**
 * GovernanceSessionFlowE2E.test.ts — 領地治理接線（#802）的跨季、讀檔、開新局流程（QA，PROG-2-0663）
 *
 * Unity 對照：像在同一個執行中的 App 裡，派武將去管內政、跑幾季讓他老死，再讀檔、再開新局，
 * 單例（GameSession）不能留著死人佔格子，也不能把別局的領地與日誌帶過來。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return { id, name: id, faction: 'shu', gender: '男', age: 40, hp: 1000, maxLifespan: 70, ...extra } as unknown as GeneralConfig;
}

function setup(roster: GeneralConfig[], adapter = new MemoryStorageAdapter()): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(false);
    session.setLifecycle({
        settleSeason: async (r: GeneralConfig[]) => ({ roster: r.filter((g) => g.status !== 'dead'), settlement: { spiritCards: [] } }),
        retireGeneral: async () => { throw new Error('not used'); },
    } as never);
    return session;
}

export function createGovernanceSessionFlowE2ESuite(): TestSuite {
    const suite = new TestSuite('GovernanceSessionFlowE2E (領地治理 跨季／讀檔／開新局 PROG-2-0663)');

    suite.test('不在名冊的武將不能被指派到內政任務格', () => {
        const session = setup([general('liu')]);
        const task = 'farming';
        assert.isFalse(session.assignGovernor(task, 'ghost').ok);
        assert.equals(0, session.governanceAssignments.length);
    });

    suite.test('被指派的武將老死後，下一季起不再佔著任務格，格子可以重新指派', async () => {
        const session = setup([general('liu', { age: 69.75 }), general('zhang')]);
        session.startNewGame(3);
        const task = 'farming';
        assert.isTrue(session.assignGovernor(task, 'liu').ok);
        session.spendLifespan('liu', 'breeding');
        await session.advanceSeason();
        assert.equals(0, session.governanceAssignments.length, '亡者不留在任務格');
        assert.isTrue(session.assignGovernor(task, 'zhang').ok);
    });

    suite.test('開新局清空治理指派與領地，讀檔再把存下的讀回來（#805 存檔後）', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = setup([general('liu'), general('zhang')], adapter);
        session.startNewGame(3);
        session.setTerritories([{ id: 'home-city', isHome: true }, { id: 'north', isHome: false }]);
        assert.isTrue(session.assignGovernor('farming', 'liu').ok);
        await session.save();
        assert.equals(2, session.territories.length);
        assert.equals(1, session.lastStand.defenseMultiplier, '還有外圍領地時沒有背水加成');

        session.startNewGame(4);
        assert.equals(0, session.governanceAssignments.length, '開新局清空指派');
        assert.equals(1, session.territories.length, '開新局只剩主城');
        assert.equals(2, session.lastStand.defenseMultiplier);

        assert.isTrue(await session.load());
        assert.equals(1, session.governanceAssignments.length, '讀檔把存下的指派讀回來');
        assert.equals(2, session.territories.length, '讀檔把存下的領地讀回來');
    });

    return suite;
}
