/**
 * ChildMagistrate.test.ts — 子嗣擔任郡城縣令（領地治理 §E #9 / §F 非培育子嗣內政職位，PROG-2-1162）
 *
 * Unity 對照：EditMode Test，驗公式與 GameSession 的指派、產出加成、存讀檔，不開 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import { isDescendant, magistrateGoldBonus } from '../assets/scripts/core/systems/ChildMagistrate';
import { domesticOutputFor } from '../assets/scripts/core/systems/DomesticTasks';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return { id, name: id, faction: 'shu', gender: '男', age: 20, hp: 1000, maxLifespan: 70, ...extra } as unknown as GeneralConfig;
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

const child = (id: string, pol: number, extra: Record<string, unknown> = {}) => general(id, { fatherId: 'dad', pol, ...extra });

export function createChildMagistrateSuite(): TestSuite {
    const suite = new TestSuite('ChildMagistrate (子嗣郡城縣令 PROG-2-1162)');

    suite.test('加成 = 20% × (1 + POL/100)；有父或母才算子嗣', () => {
        assert.equals(0.2, magistrateGoldBonus(0));
        assert.equals(0.3, magistrateGoldBonus(50));
        assert.isTrue(isDescendant({ motherId: 'm' }));
        assert.isFalse(isDescendant({}));
        assert.isFalse(isDescendant({ fatherId: '  ' }));
    });

    suite.test('黃金任務套用加成，其他任務不受影響', () => {
        assert.equals(130, domesticOutputFor('commerce', null, 0.3).amount);
        assert.equals(39, domesticOutputFor('scouting', null, 0.3).amount);
        assert.equals(120, domesticOutputFor('farming', null, 0.3).amount);
    });

    suite.test('只有存活子嗣可任縣令；任命後商業入帳含加成', async () => {
        const session = setup([general('founder', { pol: 90 }), child('kid', 50)]);
        session.startNewGame(3);
        assert.isFalse(session.setMagistrate('founder'), '非子嗣不可任');
        assert.isFalse(session.setMagistrate('nobody'));
        assert.isTrue(session.setMagistrate('kid'));
        assert.equals(0.3, session.magistrateGoldBonus);
        const granted: number[] = [];
        const result = await session.chooseDomesticTask('commerce', (amount) => granted.push(amount));
        assert.equals(130, result.output!.amount);
        assert.equals(130, granted[0]);
    });

    suite.test('縣令寫入存檔；開新局清空；陣亡後卸任', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = setup([child('kid', 10, { age: 69.75 })], adapter);
        session.startNewGame(3);
        assert.isTrue(session.setMagistrate('kid'));
        await session.save();
        session.startNewGame(4);
        assert.equals(null, session.magistrateUid);
        assert.isTrue(await session.load());
        assert.equals('kid', session.magistrateUid);
        session.spendLifespan('kid', 'breeding');
        await session.advanceSeason();
        assert.equals(null, session.magistrateUid, '陣亡卸任');
        assert.equals(0, session.magistrateGoldBonus);
    });

    return suite;
}
