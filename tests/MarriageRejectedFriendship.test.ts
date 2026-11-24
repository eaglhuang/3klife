/**
 * MarriageRejectedFriendship — PROG-2-9955 提親被拒友誼扣分接線測試
 *
 * 驗證：
 * 1. 同一季對同一位武將提親被拒，第一次扣分並發射 FriendshipActionApplied (applied=true)。
 * 2. 同一季對同一位武將被拒兩次，第二次被每季上限擋下 (applied=false)。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { GAME_SESSION_EVENTS } from '../assets/scripts/core/config/Constants';

export function createMarriageRejectedFriendshipSuite(): TestSuite {
    const suite = new TestSuite('MarriageRejectedFriendship (提親被拒友誼扣分 PROG-2-9955)');

    suite.test('同一季對同一位武將被拒兩次，第一次 applied=true，第二次 applied=false', () => {
        const session = new GameSession();
        session.startNewGame(42);
        const events: Array<{ applied: boolean; delta: number; actionId: string }> = [];
        session.on(GAME_SESSION_EVENTS.FriendshipActionApplied, (payload: any) => {
            events.push(payload);
        });

        session.recordMarriageRejected('zhao-yun', 'sun-shangxiang');
        session.recordMarriageRejected('zhao-yun', 'sun-shangxiang');

        assert.equals(events.length, 2);
        assert.equals(events[0].actionId, 'bonding_proposal_refused');
        assert.isTrue(events[0].applied);
        assert.isTrue(events[0].delta < 0);
        assert.equals(events[1].actionId, 'bonding_proposal_refused');
        assert.equals(events[1].applied, false);
    });

    return suite;
}
