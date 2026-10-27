/**
 * DomesticAutoGovernanceMode.test.ts — 內政手動／自動治理切換（領地治理 §E #7 Auto_Mode，PROG-2-1161）
 *
 * Unity 對照：像在同一個 App 裡把太守府切到自動，跑一季讓武將老死，看空出的格子有沒有被補上，再存讀檔。
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

const governorOf = (session: GameSession, task: string) => session.governanceAssignments.find((a) => a.task === task)?.generalUid;

export function createDomesticAutoGovernanceModeSuite(): TestSuite {
    const suite = new TestSuite('DomesticAutoGovernanceMode (內政手動／自動治理切換 PROG-2-1161)');

    suite.test('預設關閉；開啟時立即補空格，已有主事的格子不動', () => {
        const session = setup([general('a', { pol: 90 }), general('b', { str: 90 }), general('c', { pol: 95 })]);
        session.startNewGame(3);
        assert.isFalse(session.autoGovernance);
        assert.isTrue(session.assignGovernor('farming', 'a').ok);
        assert.equals(2, session.setAutoGovernance(true));
        assert.isTrue(session.autoGovernance);
        assert.equals('a', governorOf(session, 'farming'), '手動指派不被覆蓋');
        assert.equals('b', governorOf(session, 'arms'));
        assert.equals(3, session.governanceAssignments.length);
    });

    suite.test('自動治理開啟時，季結算後補上陣亡空出的格子', async () => {
        const session = setup([general('old', { pol: 99, age: 69.75 }), general('young', { pol: 50 })]);
        session.startNewGame(3);
        assert.isTrue(session.assignGovernor('farming', 'old').ok);
        assert.isTrue(session.assignGovernor('arms', 'young').ok);
        session.setAutoGovernance(true);
        session.spendLifespan('old', 'breeding');
        session.unassignGovernor('arms');
        await session.advanceSeason();
        assert.equals('young', governorOf(session, 'farming'), '亡者騰出的農耕由閒置武將補上');
    });

    suite.test('自動治理關閉時，季結算不補格', async () => {
        const session = setup([general('old', { age: 69.75 }), general('idle', { pol: 50 })]);
        session.startNewGame(3);
        assert.isTrue(session.assignGovernor('farming', 'old').ok);
        session.spendLifespan('old', 'breeding');
        await session.advanceSeason();
        assert.equals(0, session.governanceAssignments.length);
    });

    suite.test('開關寫入存檔：讀檔讀回開啟；開新局重置為關閉', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = setup([general('a')], adapter);
        session.startNewGame(3);
        session.setAutoGovernance(true);
        await session.save();
        session.startNewGame(4);
        assert.isFalse(session.autoGovernance, '開新局關閉');
        assert.isTrue(await session.load());
        assert.isTrue(session.autoGovernance, '讀檔讀回開啟');
    });

    return suite;
}
