/**
 * GameSessionMercenaryBattle.test.ts — 試用傭兵出戰的會話接線（RET-01 後續，PROG-2-1216）
 *
 * 多回合流程：同一位試用傭兵連續出戰，確認場數、勝場與插畫階段逐場累加，敗北與 ongoing 不增加勝場。
 * 出戰的名冊武將不受影響（試用傭兵不在名冊，settleBattle 會略過其 id）。
 *
 * Unity 對照：整場戰役的 PlayMode 測試，從第一場到第三場連續打，檢查角色上的計數器是否照規則累加。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';

function sessionWithTrial(): GameSession {
    const session = new GameSession(1);
    session.setMercenaries({
        mercenaries: [{ uid: 'merc-1', daysLeft: 3, bond: 2, status: 'Trial', affection: 10 }],
        upkeep: [],
        cooldowns: [],
    });
    return session;
}

export function createGameSessionMercenaryBattleSuite(): TestSuite {
    const suite = new TestSuite('GameSessionMercenaryBattle (試用傭兵出戰會話接線 RET-01 後續)');

    suite.test('多回合：戰勝、敗北、戰勝三次後，場數與勝場與插畫階段逐場正確', async () => {
        const session = sessionWithTrial();
        await session.recordBattle(['merc-1'], 'player-win');
        let merc = session.mercenaries.mercenaries[0];
        assert.equals(1, merc.battles!);
        assert.equals(1, merc.wins!);
        assert.equals(2, merc.illustrationStage!);

        await session.recordBattle(['merc-1'], 'enemy-win');
        merc = session.mercenaries.mercenaries[0];
        assert.equals(2, merc.battles!);
        assert.equals(1, merc.wins!);

        await session.recordBattle(['merc-1'], 'player-win');
        await session.recordBattle(['merc-1'], 'player-win');
        merc = session.mercenaries.mercenaries[0];
        assert.equals(4, merc.battles!);
        assert.equals(3, merc.wins!);
        assert.equals(3, merc.illustrationStage!);
    });

    suite.test('ongoing 與未出戰的傭兵都不計數', async () => {
        const session = sessionWithTrial();
        await session.recordBattle(['merc-1'], 'ongoing');
        await session.recordBattle(['someone-else'], 'player-win');
        const merc = session.mercenaries.mercenaries[0];
        assert.isTrue(merc.battles === undefined);
        assert.isTrue(merc.wins === undefined);
    });

    return suite;
}
