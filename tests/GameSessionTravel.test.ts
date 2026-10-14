import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { EXPEDITION_TRAVEL_TURNS } from '../assets/scripts/core/systems/TravelCountdown';

export function createGameSessionTravelSuite(): TestSuite {
    const suite = new TestSuite('GameSessionTravel (PROG-2-0475 趕路觸發與存檔)');

    suite.test('startTravel 記下目標與剩餘回合；遠征趕來回合數為暫定常數', () => {
        const session = new GameSession(1);
        assert.equals(null, session.travel);
        session.startTravel('zhang-fei', EXPEDITION_TRAVEL_TURNS);
        assert.equals('zhang-fei', session.travel!.targetId);
        assert.equals(EXPEDITION_TRAVEL_TURNS, session.travel!.remainingTurns);
    });

    suite.test('每季遞減，歸零即到達並清除', async () => {
        const session = new GameSession(1);
        session.startTravel('zhang-fei', 2);
        await session.advanceSeason();
        assert.equals(1, session.travel!.remainingTurns);
        await session.advanceSeason();
        assert.equals(null, session.travel);
    });

    suite.test('存檔快照帶上趕路；新局清除趕路與舊倒數', () => {
        const session = new GameSession(1);
        session.startTravel('zhang-fei', 3);
        const snapshot = session.createSnapshot();
        assert.equals('zhang-fei', snapshot.travelCountdown!.targetId);
        assert.equals(3, snapshot.travelCountdown!.remainingTurns);
        session.startNewGame(7);
        assert.equals(null, session.travel);
        assert.equals(undefined, session.createSnapshot().travelCountdown);
    });

    return suite;
}
