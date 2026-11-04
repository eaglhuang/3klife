/**
 * HallCrowdReaction.test.ts — 高難任務派遣的大廳集體反應（大廳系統 §E-5，PROG-2-1740）
 */
import { assert, TestSuite } from './TestRunner';
import { HALL_DIFFICULTY_MIN_RANK } from '../assets/scripts/core/systems/HallMissionBoard';
import { hallCrowdReactionOf } from '../assets/scripts/core/systems/HallCrowdReaction';

export function createHallCrowdReactionSuite(): TestSuite {
    const suite = new TestSuite('HallCrowdReaction (大廳高難任務集體反應 PROG-2-1740)');

    suite.test('只有高級與地獄任務觸發，地獄用兩個驚嘆號', () => {
        assert.equals('！', hallCrowdReactionOf('ADVANCED')?.text ?? '');
        assert.equals('！！', hallCrowdReactionOf('HELL')?.text ?? '');
        assert.equals(null, hallCrowdReactionOf('EASY'));
        assert.equals(null, hallCrowdReactionOf('NORMAL'));
        assert.equals(null, hallCrowdReactionOf('ELITE'));
        assert.equals(null, hallCrowdReactionOf(''));
        assert.equals(null, hallCrowdReactionOf(null));
    });

    suite.test('觸發難度都是任務牆認得的五級難度', () => {
        for (const difficulty of ['ADVANCED', 'HELL']) {
            assert.isTrue(HALL_DIFFICULTY_MIN_RANK[difficulty] !== undefined, difficulty);
            assert.isTrue((hallCrowdReactionOf(difficulty)?.durationSec ?? 0) > 0, `${difficulty} 持續時間大於 0`);
        }
    });

    return suite;
}
