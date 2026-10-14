import { TestSuite, assert } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';

// 結義傭兵事件呼叫端（PROG-2-0533）：暫定以出戰主將為結義對象。

export function createMercenaryOathWiringSuite(): TestSuite {
    const suite = new TestSuite('MercenaryOathWiring (PROG-2-0533 結義義兄弟)');

    suite.test('沒有出戰主將時不記結義關係，回傳 null', async () => {
        const session = new GameSession(3);
        const result = await session.recordMercenaryOath('merc-1');
        assert.equals(null, result);
        assert.equals(0, session.dynamicRelations.listFor('merc-1').length);
    });

    return suite;
}
