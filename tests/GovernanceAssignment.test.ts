/**
 * GovernanceAssignment.test.ts — 太守府內政武將指派（GOV-04 / PROG-2-0970）
 */
import { assert, TestSuite } from './TestRunner';
import {
    assignGovernanceGeneral,
    GovernanceAssignment,
    isGovernanceTaskOccupied,
    removeGovernanceAssignment,
} from '../assets/scripts/core/systems/GovernanceAssignment';

export function createGovernanceAssignmentSuite(): TestSuite {
    const suite = new TestSuite('GovernanceAssignment (GOV-04 內政武將指派)');

    suite.test('空格指派成功，回傳新清單', () => {
        const result = assignGovernanceGeneral([], 'farming', 'G010');
        assert.isTrue(result.ok);
        assert.equals(1, result.assignments.length);
        assert.equals('farming', result.assignments[0].task);
        assert.equals('G010', result.assignments[0].generalUid);
    });

    suite.test('任務格已有人時拒絕，原清單不變', () => {
        const current: GovernanceAssignment[] = [{ task: 'farming', generalUid: 'G010' }];
        const result = assignGovernanceGeneral(current, 'farming', 'G045');
        assert.isFalse(result.ok);
        assert.equals('task-occupied', result.reason!);
        assert.equals('G010', result.assignments[0].generalUid);
    });

    suite.test('同一武將不可重複指派到另一個任務格', () => {
        const current: GovernanceAssignment[] = [{ task: 'farming', generalUid: 'G010' }];
        const result = assignGovernanceGeneral(current, 'commerce', 'G010');
        assert.isFalse(result.ok);
        assert.equals('general-already-assigned', result.reason!);
        assert.equals(1, result.assignments.length);
    });

    suite.test('已用格數達上限時拒絕，上限由呼叫端傳入', () => {
        const current: GovernanceAssignment[] = [
            { task: 'farming', generalUid: 'G010' },
            { task: 'commerce', generalUid: 'G045' },
        ];
        const full = assignGovernanceGeneral(current, 'arms', 'G099', 2);
        assert.isFalse(full.ok);
        assert.equals('no-free-slot', full.reason!);
        const roomy = assignGovernanceGeneral(current, 'arms', 'G099', 3);
        assert.isTrue(roomy.ok);
        assert.equals(3, roomy.assignments.length);
    });

    suite.test('不認識的任務 ID 拒絕；空武將 ID 拒絕', () => {
        const unknown = assignGovernanceGeneral([], 'mining', 'G010');
        assert.isFalse(unknown.ok);
        assert.equals('unknown-task', unknown.reason!);
        const empty = assignGovernanceGeneral([], 'farming', '');
        assert.isFalse(empty.ok);
        assert.equals('invalid-general', empty.reason!);
    });

    suite.test('卸下任務格：只移除該格，其他格不變', () => {
        const current: GovernanceAssignment[] = [
            { task: 'farming', generalUid: 'G010' },
            { task: 'commerce', generalUid: 'G045' },
        ];
        const result = removeGovernanceAssignment(current, 'farming');
        assert.equals(1, result.assignments.length);
        assert.equals('commerce', result.assignments[0].task);
        assert.isFalse(isGovernanceTaskOccupied(result.assignments, 'farming'));
    });

    suite.test('卸下後同一武將可以重新指派', () => {
        const cleared = removeGovernanceAssignment([{ task: 'farming', generalUid: 'G010' }], 'farming');
        const result = assignGovernanceGeneral(cleared.assignments, 'commerce', 'G010');
        assert.isTrue(result.ok);
    });

    suite.test('不改輸入：指派與卸下都回傳副本', () => {
        const current: GovernanceAssignment[] = [{ task: 'farming', generalUid: 'G010' }];
        assignGovernanceGeneral(current, 'commerce', 'G045');
        removeGovernanceAssignment(current, 'farming');
        assert.equals(1, current.length);
        assert.equals('farming', current[0].task);
    });

    return suite;
}
