/**
 * PROG-2-1167：教官 ★2「訓練機率 +3%」= 訓練成功率
 * 站在本回合訓練格的教官取最高加成，從體力失敗率扣掉，最低 0。
 */

import { assert, TestSuite } from './TestRunner';
import { failureRateForVigor, trainingFailureRate, type TrainingMentor } from '../assets/scripts/core/systems/NurtureSystem';

function mentor(id: string, stars: number): TrainingMentor {
    return { id, name: id, tpBonus: 0, specialty: 'str', stars } as TrainingMentor;
}

export function createMentorTrainingSuccessSuite(): TestSuite {
    const suite = new TestSuite('MentorTrainingSuccess');

    suite.test('沒有 ★2 以上教官在格上：失敗率不變', () => {
        assert.equals(failureRateForVigor(20), trainingFailureRate(20, []));
        assert.equals(failureRateForVigor(20), trainingFailureRate(20, [mentor('a', 1)]));
    });

    suite.test('★2 教官在格上：失敗率 −3 個百分點', () => {
        const base = failureRateForVigor(20);
        assert.equals(base - 0.03, trainingFailureRate(20, [mentor('a', 2)]));
        assert.equals(base - 0.03, trainingFailureRate(20, [mentor('a', 5)]));
    });

    suite.test('多位教官不疊加；失敗率最低 0', () => {
        const base = failureRateForVigor(20);
        assert.equals(base - 0.03, trainingFailureRate(20, [mentor('a', 2), mentor('b', 3)]));
        assert.equals(0, trainingFailureRate(80, [mentor('a', 2)]), '體力高時本來就 0');
        assert.equals(0, trainingFailureRate(69, [mentor('a', 2)]), '1.35% 扣 3% 不會變負數');
    });

    return suite;
}
