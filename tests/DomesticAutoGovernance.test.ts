/**
 * DomesticAutoGovernance.test.ts — 內政自動指派（領地治理系統 §F 自動治理分配，PROG-2-1160）
 *
 * Unity 對照：EditMode Test 測純 Utility，不開 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import { domesticAffinity, planAutoGovernance } from '../assets/scripts/core/systems/DomesticAutoGovernance';
import type { DomesticStats, DomesticTaskId } from '../assets/scripts/core/systems/DomesticTasks';

function stats(partial: Partial<DomesticStats>): DomesticStats {
    return { str: 0, int: 0, pol: 0, cha: 0, ...partial };
}

const none = (): string | null => null;

export function createDomesticAutoGovernanceSuite(): TestSuite {
    const suite = new TestSuite('DomesticAutoGovernance (內政自動指派 PROG-2-1160)');

    suite.test('親和度 = §F 主屬性 × 權重（不含 Base）', () => {
        const s = stats({ str: 50, int: 40, pol: 30, cha: 20 });
        assert.equals(60, domesticAffinity('farming', s));
        assert.equals(60, domesticAffinity('commerce', s));
        assert.equals(60, domesticAffinity('diplomacy', s));
        assert.equals(100, domesticAffinity('arms', s));
        assert.equals(80, domesticAffinity('scouting', s));
    });

    suite.test('五格全空時每位武將各去自己最擅長的格子', () => {
        const picks = planAutoGovernance([
            { id: 'farmer', stats: stats({ pol: 90 }) },
            { id: 'merchant', stats: stats({ cha: 90 }) },
            { id: 'warrior', stats: stats({ str: 90 }) },
            { id: 'scout', stats: stats({ int: 90 }) },
            { id: 'envoy', stats: stats({ int: 60, cha: 60 }) },
        ], none);
        const of = (task: DomesticTaskId) => picks.find((p) => p.task === task)?.generalUid;
        assert.equals(5, picks.length);
        assert.equals('farmer', of('farming'));
        assert.equals('merchant', of('commerce'));
        assert.equals('warrior', of('arms'));
        assert.equals('scout', of('scouting'));
        assert.equals('envoy', of('diplomacy'));
    });

    suite.test('已指派的格子與武將不動，只補空格', () => {
        const picks = planAutoGovernance([
            { id: 'a', stats: stats({ pol: 99 }) },
            { id: 'b', stats: stats({ pol: 80 }) },
        ], (task) => (task === 'farming' ? 'a' : null));
        assert.equals(1, picks.length);
        assert.equals('b', picks[0].generalUid);
        assert.isTrue(picks[0].task !== 'farming');
    });

    suite.test('武將少於空格時部分補滿；親和度最高的一組先指派', () => {
        const picks = planAutoGovernance([
            { id: 'weak', stats: stats({ pol: 10 }) },
            { id: 'strong', stats: stats({ pol: 90 }) },
        ], none);
        assert.equals(2, picks.length);
        assert.equals('strong', picks[0].generalUid);
        assert.equals('farming', picks[0].task);
    });

    suite.test('沒有閒置武將或沒有空格時回傳空', () => {
        assert.equals(0, planAutoGovernance([], none).length);
        assert.equals(0, planAutoGovernance([{ id: 'x', stats: stats({}) }], () => 'y').length);
    });

    return suite;
}
