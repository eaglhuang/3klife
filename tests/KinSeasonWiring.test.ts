import { TestSuite, assert } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { DYNAMIC_RELATION_INITIAL_INTIMACY, DYNAMIC_RELATION_DECAY_RATE } from '../assets/scripts/core/systems/KinDynamicRelations';

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

    return suite;
}
