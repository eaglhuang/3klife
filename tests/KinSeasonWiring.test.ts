import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import {
    normalizeDynamicRelations,
    DYNAMIC_RELATION_DECAY_RATE,
    DYNAMIC_RELATION_INITIAL_INTIMACY,
    DYNAMIC_RELATION_INTERACT_GAIN,
} from '../assets/scripts/core/systems/KinDynamicRelations';

export function createKinSeasonWiringSuite(): TestSuite {
    const suite = new TestSuite('KinSeasonWiring (KIN-10 換季衰退接線)');

    suite.test('換季時動態關係依 decayRate 衰退', async () => {
        const session = new GameSession();
        session.dynamicRelations.record('bonding', 'liu', 'sun', 1);
        await session.advanceSeason();
        const [rel] = session.dynamicRelations.listFor('liu');
        assert.equals(DYNAMIC_RELATION_INITIAL_INTIMACY - DYNAMIC_RELATION_DECAY_RATE, rel.intimacy);
    });

    suite.test('多次換季持續衰退，親密度歸 0 後關係仍保留', async () => {
        const session = new GameSession();
        session.dynamicRelations.record('parentage', 'a', 'b', 1);
        for (let i = 0; i < 30; i++) await session.advanceSeason();
        const rels = session.dynamicRelations.listFor('a');
        assert.equals(1, rels.length);
        assert.equals(0, rels[0].intimacy);
    });

    suite.test('存讀往返：動態關係的親密度與身分保留；舊檔沒有此欄位讀回空', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([]));
        session.setSaveService(new PlayerSaveService(adapter));
        session.dynamicRelations.record('bonding', 'liu', 'sun', 1);
        session.dynamicRelations.record('parentage', 'liu', 'liu-shan', 1);
        await session.advanceSeason();
        await session.save();

        const restored = new GameSession(3);
        restored.setRosterStore(new InMemoryRosterStore([]));
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());
        const rels = restored.dynamicRelations.listFor('liu');
        assert.equals(2, rels.length);
        assert.equals(DYNAMIC_RELATION_INITIAL_INTIMACY - DYNAMIC_RELATION_DECAY_RATE, rels.find((r) => r.type === 'SPOUSE')!.intimacy);
        assert.equals('PARENT_CHILD', rels.find((r) => r.type === 'PARENT_CHILD')!.type);

        assert.equals(0, normalizeDynamicRelations(undefined).length, '舊檔沒有欄位');
        assert.equals(0, normalizeDynamicRelations('壞資料').length, '非陣列視為空');
    });

    suite.test('互動觸發：回補親密度並自動存檔；沒有該對關係不存檔', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([]));
        session.setSaveService(new PlayerSaveService(adapter));
        session.dynamicRelations.record('battle-comrade', 'zhao', 'ma', 1);
        await session.advanceSeason();
        const updated = await session.interactDynamicRelation('ma', 'zhao');
        assert.equals(1, updated.length);
        assert.equals(DYNAMIC_RELATION_INITIAL_INTIMACY - DYNAMIC_RELATION_DECAY_RATE + DYNAMIC_RELATION_INTERACT_GAIN, updated[0].intimacy);

        const restored = new GameSession(3);
        restored.setRosterStore(new InMemoryRosterStore([]));
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());
        assert.equals(updated[0].intimacy, restored.dynamicRelations.listFor('zhao')[0].intimacy, '互動後已自動存檔');
        assert.equals(0, (await session.interactDynamicRelation('x', 'y')).length);
    });

    return suite;
}
