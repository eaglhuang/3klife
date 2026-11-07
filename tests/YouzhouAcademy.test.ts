/**
 * YouzhouAcademy — 幽州演武煞氣突破（doc_spec_0304；PROG-2-2010）
 */
import { assert, TestSuite } from './TestRunner';
import type { IDeterministicRng } from '../assets/scripts/core/systems/nurture/AcademyTypes';
import {
    canStartSurge, createYouzhouState, isYouzhouSkirmishTurn, processYouzhouTurn, resolveYouzhouSkirmish, startSurge,
    youzhouGraduationRewards,
} from '../assets/scripts/core/systems/nurture/YouzhouAcademy';

function fixedRng(hit: boolean): IDeterministicRng {
    return {
        seedHex: '0', stepIndex: 0,
        nextUint32: () => 0, nextInt: () => 0,
        chance: () => hit, pickWeighted: () => 0,
    } as unknown as IDeterministicRng;
}

export function createYouzhouAcademySuite(): TestSuite {
    const suite = new TestSuite('YouzhouAcademy (幽州演武 doc_spec_0304 PROG-2-2010)');

    suite.test('雙軌操練累積煞氣，上限 100；80 可突破', () => {
        let s = createYouzhouState();
        const r = processYouzhouTurn(s, 100, true, fixedRng(false));
        assert.equals(15, r.state.maliceGauge);
        assert.equals(-20, r.energyDelta);
        assert.equals(1.5, r.statMultiplier);
        assert.equals(-10, processYouzhouTurn(s, 100, false, fixedRng(false)).energyDelta);
        s = { ...s, maliceGauge: 95 };
        assert.equals(100, processYouzhouTurn(s, 100, true, fixedRng(false)).state.maliceGauge);
        assert.isFalse(canStartSurge({ ...s, maliceGauge: 79 }));
        assert.isTrue(startSurge({ ...s, maliceGauge: 80 }).isSurgeActive);
    });

    suite.test('突破 3 回合 ×2.2，結束歸零並得武勳', () => {
        let s = startSurge({ ...createYouzhouState(), maliceGauge: 90 });
        let r = processYouzhouTurn(s, 100, false, fixedRng(true));
        assert.equals(2.2, r.statMultiplier);
        assert.equals(-20, r.energyDelta);
        s = processYouzhouTurn(r.state, 80, false, fixedRng(true)).state;
        r = processYouzhouTurn(s, 60, false, fixedRng(true));
        assert.isFalse(r.state.isSurgeActive);
        assert.equals(0, r.state.maliceGauge);
        assert.equals(1, r.state.valorPoints);
        assert.equals(1, r.state.completedSurges);
    });

    suite.test('精力 < 20 戰傷：中止並休養 1 回合', () => {
        const s = startSurge({ ...createYouzhouState(), maliceGauge: 90 });
        const r = processYouzhouTurn(s, 19, false, fixedRng(true));
        assert.isFalse(r.state.isSurgeActive);
        assert.equals(0, r.state.valorPoints);
        assert.equals(1, r.state.restTurns);
        const rest = processYouzhouTurn(r.state, 100, true, fixedRng(false));
        assert.equals(0, rest.statMultiplier);
        assert.equals(0, rest.state.restTurns);
        assert.isTrue(processYouzhouTurn(s, 19, false, fixedRng(false)).state.isSurgeActive);
    });

    suite.test('胡騎犯邊與結業產出', () => {
        assert.isTrue(isYouzhouSkirmishTurn(20));
        assert.isFalse(isYouzhouSkirmishTurn(15));
        const s = createYouzhouState();
        assert.equals(100, resolveYouzhouSkirmish(s, 'A', true).state.maliceGauge);
        assert.equals(-15, resolveYouzhouSkirmish(s, 'A', false).energyDelta);
        assert.isTrue(resolveYouzhouSkirmish(s, 'B', false).halveDefenseExp);
        const g = youzhouGraduationRewards(88, 85, { ...s, completedSurges: 2, valorPoints: 2 });
        assert.equals('TAC_TUQI_POZHEN,TAC_BAIMA_YICONG,TRT_SAIWAI_BAIZHAN', g.join(','));
        assert.equals(0, youzhouGraduationRewards(87, 80, s).length);
    });

    return suite;
}
