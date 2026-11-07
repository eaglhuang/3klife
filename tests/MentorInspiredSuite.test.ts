/**
 * MentorInspiredSuite — 教官六招 TP 與解鎖（doc_spec_0364；PROG-2-2048）
 */
import { assert, TestSuite } from './TestRunner';
import { G2_TACTIC_COSTS, g2CastTp, unlockableG2Tactics } from '../assets/scripts/core/systems/MentorInspiredSuite';

const base = { mentorId: 'zhuge-liang', affinityLevel: 0, bond: 0, str: 50, int: 50, cha: 50 };

export function createMentorInspiredSuiteSuite(): TestSuite {
    const suite = new TestSuite('MentorInspiredSuite (教官六招 doc_spec_0364 PROG-2-2048)');

    suite.test('§3 六招 TP 階梯與綠色因子折半保底 10', () => {
        assert.equals(6, Object.keys(G2_TACTIC_COSTS).length);
        assert.equals(60, g2CastTp('TAC_EIGHT_ARRAY', false));
        assert.equals(30, g2CastTp('TAC_EIGHT_ARRAY', true));
        assert.equals(10, g2CastTp('TAC_HEAL', true));
        assert.equals(5, G2_TACTIC_COSTS.TAC_EIGHT_ARRAY.recastTurns);
    });

    suite.test('§4 諸葛亮依好感與智力逐階解鎖', () => {
        assert.equals('', unlockableG2Tactics({ ...base, affinityLevel: 1 }).join(','));
        assert.equals('TAC_SLOW', unlockableG2Tactics({ ...base, affinityLevel: 4, int: 79 }).join(','));
        assert.equals('TAC_SLOW,TAC_EMPTY_FORT', unlockableG2Tactics({ ...base, affinityLevel: 4, int: 80 }).join(','));
        assert.equals('TAC_SLOW,TAC_EMPTY_FORT,TAC_EIGHT_ARRAY', unlockableG2Tactics({ ...base, affinityLevel: 5, int: 90 }).join(','));
    });

    suite.test('§4 趙雲要力量 80 且羈絆滿；魯肅要魅力 75', () => {
        assert.equals('', unlockableG2Tactics({ ...base, mentorId: 'zhao-yun', str: 80, bond: 99 }).join(','));
        assert.equals('TAC_LONE_RIDER', unlockableG2Tactics({ ...base, mentorId: 'zhao-yun', str: 80, bond: 100 }).join(','));
        assert.equals('TAC_INSPIRE,TAC_HEAL', unlockableG2Tactics({ ...base, mentorId: 'lu-su', cha: 75 }).join(','));
    });

    return suite;
}
