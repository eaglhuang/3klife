import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { MercenarySaveBundle } from '../assets/scripts/core/systems/MercenarySaveModel';

const BUNDLE: MercenarySaveBundle = {
    mercenaries: [{ uid: 'merc-1', daysLeft: 2, bond: 10, status: 'Trial' }],
    upkeep: [],
    cooldowns: [{ uid: 'merc-9', availableOnDay: 30 }],
};

export function createGameSessionMercenarySuite(): TestSuite {
    const suite = new TestSuite('GameSessionMercenary (MERC-01 會話接線)');

    suite.test('新會話的傭兵包為空，快照帶空包', () => {
        const session = new GameSession(1);
        assert.equals(0, session.mercenaries.mercenaries.length);
        assert.equals(0, session.createSnapshot(new Date(0)).mercenaries!.mercenaries.length);
    });

    suite.test('setMercenaries 後快照帶入傭兵包', () => {
        const session = new GameSession(1);
        session.setMercenaries(BUNDLE);
        const snapshot = session.createSnapshot(new Date(0));
        assert.equals(JSON.stringify(BUNDLE), JSON.stringify(snapshot.mercenaries));
    });

    suite.test('getter 回傳副本，外部修改不影響會話內容', () => {
        const session = new GameSession(1);
        session.setMercenaries(BUNDLE);
        session.mercenaries.mercenaries[0].daysLeft = 0;
        assert.equals(2, session.mercenaries.mercenaries[0].daysLeft);
    });

    suite.test('startNewGame 會清空傭兵包', () => {
        const session = new GameSession(1);
        session.setMercenaries(BUNDLE);
        session.startNewGame(2);
        assert.equals(0, session.mercenaries.mercenaries.length);
    });

    return suite;
}
