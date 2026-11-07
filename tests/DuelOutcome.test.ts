/**
 * DuelOutcome — 單挑勝負結算（doc_spec_0314 TC-DUEL-03/04；PROG-2-1940）
 */
import { assert, TestSuite } from './TestRunner';
import {
    resolveDuelOutcome, troopsAfterDuelFlee,
} from '../assets/scripts/battle/shared/DuelOutcome';

export function createDuelOutcomeSuite(): TestSuite {
    const suite = new TestSuite('DuelOutcome (單挑勝負結算 doc_spec_0314 PROG-2-1940)');

    suite.test('TC-DUEL-03 勝方 +15 名聲並推動即時升階、士氣 100、暴擊 +15% 兩回合', () => {
        const r = resolveDuelOutcome({ uid: 'g1', name: '關羽', generalFame: 90, generalRank: 0 }, false);
        assert.equals(105, r.winner.general.generalFame);
        assert.isTrue(r.winner.event !== null);
        assert.equals(15, r.winner.event!.fameDelta);
        assert.equals(100, r.winnerEffects.morale);
        assert.equals(0.15, r.winnerEffects.critBonus);
        assert.equals(2, r.winnerEffects.buffTurns);
        const noRank = resolveDuelOutcome({ uid: 'g2', name: '張飛', generalFame: 0, generalRank: 0 }, false);
        assert.equals(15, noRank.winner.general.generalFame);
        assert.equals(null, noRank.winner.event);
    });

    suite.test('TC-DUEL-04 斬將：敵軍潰散、產虎符卡、戰歿遺書；敗逃：HP 歸 1、兵力崩半', () => {
        const kill = resolveDuelOutcome({ uid: 'g1', name: '關羽', generalFame: 0, generalRank: 0 }, true).loserEffects;
        assert.isTrue(kill.killed && kill.armyRouted && kill.dropsLegacyTally);
        assert.equals(0, kill.commanderHp);
        assert.equals('BattleDeath', kill.epitaph);
        const flee = resolveDuelOutcome({ uid: 'g1', name: '關羽', generalFame: 0, generalRank: 0 }, false).loserEffects;
        assert.isFalse(flee.killed || flee.armyRouted || flee.dropsLegacyTally);
        assert.equals(1, flee.commanderHp);
        assert.equals(0.5, flee.squadLossRatio);
        assert.equals(null, flee.epitaph);
        assert.equals(250, troopsAfterDuelFlee(501));
        assert.equals(0, troopsAfterDuelFlee(-5));
    });

    return suite;
}
