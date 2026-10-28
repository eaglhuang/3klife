/**
 * RivalGeneralUpkeep.test.ts — 他國 AI 武將經營：結緣、退役、死亡、俘虜（E-7，PROG-2-1477）
 */
import {
    aiPrisonerDecision, canAiStartBonding, isGeneralDead, isRetirementCandidate, shouldReleaseToMercenaryMarket,
} from '../assets/scripts/core/systems/RivalGeneralUpkeep';
import { TestSuite, assert } from './TestRunner';

export function createRivalGeneralUpkeepSuite(): TestSuite {
    const suite = new TestSuite('RivalGeneralUpkeep (他國 AI 武將經營 E-7 PROG-2-1477)');

    suite.test('結緣需有配對且糧草 > 2000', () => {
        assert.isTrue(canAiStartBonding(1, 2001));
        assert.isTrue(!canAiStartBonding(1, 2000));
        assert.isTrue(!canAiStartBonding(0, 9000));
    });

    suite.test('退役候選：65 歲以上且仍在役', () => {
        assert.isTrue(isRetirementCandidate(65, 'ACTIVE'));
        assert.isTrue(!isRetirementCandidate(64, 'ACTIVE'));
        assert.isTrue(!isRetirementCandidate(70, 'RETIRED'));
    });

    suite.test('死亡判定與流入傭兵市場機率', () => {
        assert.isTrue(isGeneralDead(81, 80, 50));
        assert.isTrue(isGeneralDead(40, 80, 0));
        assert.isTrue(!isGeneralDead(80, 80, 1));
        assert.isTrue(shouldReleaseToMercenaryMarket(() => 0.29));
        assert.isTrue(!shouldReleaseToMercenaryMarket(() => 0.3));
    });

    suite.test('俘虜：低忠誠擲骰招降，否則超過 4 季釋放', () => {
        assert.equals('RECRUIT', aiPrisonerDecision(29, 0, () => 0.49));
        assert.equals('HOLD', aiPrisonerDecision(29, 4, () => 0.5));
        assert.equals('RELEASE', aiPrisonerDecision(29, 5, () => 0.9));
        let rolled = false;
        assert.equals('HOLD', aiPrisonerDecision(30, 1, () => { rolled = true; return 0; }));
        assert.isTrue(!rolled, '忠誠未低於門檻時不消耗擲骰');
    });

    return suite;
}
