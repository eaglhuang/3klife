/**
 * GovernanceAutoAssign.test.ts — 自動治理分配的親和度與閒置武將分派（PROG-2-0978）
 */
import { assert, TestSuite } from './TestRunner';
import { autoAssignIdle, taskAffinity } from '../assets/scripts/core/systems/GovernanceAutoAssign';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string, stats: Partial<Pick<GeneralConfig, 'str' | 'int' | 'lea' | 'luk' | 'pol' | 'cha'>>): GeneralConfig {
    return { id, name: id, faction: 'wei' as GeneralConfig['faction'], hp: 100, ...stats } as GeneralConfig;
}

export function createGovernanceAutoAssignSuite(): TestSuite {
    const suite = new TestSuite('GovernanceAutoAssign (PROG-2-0978 自動治理分配)');

    suite.test('親和度依主屬性：農耕看 POL、外交為 INT+CHR 加總', () => {
        const g = general('G1', { pol: 70, cha: 30, int: 20 });
        assert.equals(70, taskAffinity(g, 'farming'));
        assert.equals(50, taskAffinity(g, 'diplomacy'));
        assert.equals(30, taskAffinity(g, 'commerce'));
    });

    suite.test('閒置武將分到親和度最高的未佔用任務', () => {
        const roster = [general('G1', { str: 90 }), general('G2', { pol: 80 })];
        const result = autoAssignIdle([], roster);
        assert.equals('arms', result.assignments.find(a => a.generalUid === 'G1')!.task);
        assert.equals('farming', result.assignments.find(a => a.generalUid === 'G2')!.task);
        assert.equals(2, result.added.length);
    });

    suite.test('已指派的武將與任務不被改動；已佔用的任務不再分派', () => {
        const current = [{ task: 'arms' as const, generalUid: 'G1' }];
        const roster = [general('G1', { str: 90 }), general('G2', { str: 80 })];
        const result = autoAssignIdle(current, roster);
        assert.equals(2, result.assignments.length);
        assert.equals('G1', result.assignments[0].generalUid);
        assert.equals('arms', result.assignments[0].task);
        assert.isFalse(result.assignments.some(a => a.generalUid === 'G2' && a.task === 'arms'));
    });

    suite.test('格數滿時停止，不超過 maxSlots', () => {
        const roster = [general('G1', { pol: 10 }), general('G2', { pol: 20 }), general('G3', { pol: 30 })];
        const result = autoAssignIdle([], roster, 2);
        assert.equals(2, result.assignments.length);
        assert.equals('G1', result.assignments[0].generalUid);
        assert.isFalse(result.assignments.some(a => a.generalUid === 'G3'));
    });

    suite.test('平手取任務表順序較前者，結果可重現；不改輸入', () => {
        const roster = [general('G1', {})];
        const current = [{ task: 'farming' as const, generalUid: 'G9' }];
        const snapshot = JSON.stringify(current);
        const first = autoAssignIdle(current, roster);
        const second = autoAssignIdle(current, roster);
        assert.equals(JSON.stringify(first), JSON.stringify(second));
        assert.equals('commerce', first.assignments[1].task);
        assert.equals(snapshot, JSON.stringify(current));
    });

    return suite;
}
