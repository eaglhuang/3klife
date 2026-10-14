import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';

// 結緣事件呼叫端（PROG-2-0530）：受孕後記夫妻與親子，同一對同一型別只留一筆。

function sessionWith(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    return session;
}

export function createBreedingRelationWiringSuite(): TestSuite {
    const suite = new TestSuite('BreedingRelationWiring (PROG-2-0530 結緣與親子事件)');

    suite.test('受孕後記三筆：父母為夫妻，父與母各與子嗣為親子', async () => {
        const session = new GameSession(3);
        const results = await session.recordBreedingRelations('zhou-yu', 'xiao-qiao', 'child-1');
        assert.equals(3, results.length);
        assert.isTrue(results.every((r) => r.ok && r.created));
        assert.equals(2, session.dynamicRelations.listFor('zhou-yu').length);
        assert.equals(2, session.dynamicRelations.listFor('child-1').length);
    });

    suite.test('同一對父母再次受孕：夫妻不重複記，新子嗣的親子仍會記', async () => {
        const session = new GameSession(3);
        await session.recordBreedingRelations('zhou-yu', 'xiao-qiao', 'child-1');
        const again = await session.recordBreedingRelations('zhou-yu', 'xiao-qiao', 'child-2');
        assert.isFalse(again[0].ok && again[0].created, '夫妻已存在');
        assert.isTrue(again[1].ok && again[1].created, '新子嗣的父子關係');
        assert.isTrue(again[2].ok && again[2].created, '新子嗣的母子關係');
        assert.equals(3, session.dynamicRelations.listFor('zhou-yu').length, '夫妻 1 + 兩個子嗣的親子');
    });

    suite.test('存讀往返：三筆關係與親密度保留', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = sessionWith(adapter);
        await session.recordBreedingRelations('zhou-yu', 'xiao-qiao', 'child-1');

        const restored = sessionWith(adapter);
        assert.isTrue(await restored.load());
        assert.equals(2, restored.dynamicRelations.listFor('zhou-yu').length);
        assert.equals(2, restored.dynamicRelations.listFor('child-1').length);
    });

    return suite;
}
