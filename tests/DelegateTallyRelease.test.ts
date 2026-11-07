import { delegateTallyRelease } from '../assets/scripts/core/systems/DelegateTallyRelease';
import { TestSuite, assert } from './TestRunner';

export function createDelegateTallyReleaseSuite(): TestSuite {
    const suite = new TestSuite('DelegateTallyRelease（TRP-20 委任虎符出展 PROG-2-1982）');
    const base = { int: 80, food: 1000, seasonFoodUse: 100, tallyFoodCost: 300, enemyFamousVisible: true };
    suite.test('高智力：名將現身且糧草夠 2 季才放', () => {
        assert.equals('release', delegateTallyRelease(base).reason);
        assert.equals('hold-for-famous', delegateTallyRelease({ ...base, enemyFamousVisible: false }).reason);
        assert.equals('hold-food-reserve', delegateTallyRelease({ ...base, food: 450 }).reason);
        assert.isTrue(delegateTallyRelease({ ...base, food: 500 }).release);
    });
    suite.test('智力 <75 不存，糧夠就放；糧不夠一律不放', () => {
        assert.isTrue(delegateTallyRelease({ ...base, int: 74, enemyFamousVisible: false, food: 300 }).release);
        assert.equals('no-food', delegateTallyRelease({ ...base, int: 40, food: 200 }).reason);
    });
    return suite;
}
