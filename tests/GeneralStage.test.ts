import { assert, TestSuite } from './TestRunner';
import {
    advanceGeneralStage,
    deriveGeneralStage,
    GENERAL_STAGE_START_AGE,
    GENERAL_STAGES,
    GeneralStageState,
    restoreGeneralStage,
} from '../assets/scripts/core/systems/GeneralStage';

export function createGeneralStageSuite(): TestSuite {
    const suite = new TestSuite('GeneralStage (GEN-07 生命週期狀態機)');

    suite.test('狀態順序為出生→開獎→成年→巔峰→衰老→退役，門檻單調遞增', () => {
        assert.equals('birth,unveiling,adult,peak,decline,retired', GENERAL_STAGES.join(','));
        for (let i = 1; i < GENERAL_STAGES.length; i++) {
            assert.isTrue(GENERAL_STAGE_START_AGE[GENERAL_STAGES[i]] > GENERAL_STAGE_START_AGE[GENERAL_STAGES[i - 1]]);
        }
    });

    suite.test('年齡到門檻邊界時切換階段（含起點，不含終點）', () => {
        const cases: [number, string][] = [
            [0, 'birth'], [4.99, 'birth'],
            [5, 'unveiling'], [19.99, 'unveiling'],
            [20, 'adult'], [39.99, 'adult'],
            [40, 'peak'], [54.99, 'peak'],
            [55, 'decline'], [64.99, 'decline'],
            [65, 'retired'], [90, 'retired'],
        ];
        for (const [age, stage] of cases) assert.equals(stage, deriveGeneralStage(age));
    });

    suite.test('非法年齡拋出 RangeError', () => {
        assert.throws(() => deriveGeneralStage(-1));
        assert.throws(() => deriveGeneralStage(NaN));
        assert.throws(() => deriveGeneralStage(Infinity));
    });

    suite.test('跨過門檻時發出 stage-changed，且不修改輸入', () => {
        const source: GeneralStageState = Object.freeze({ stage: 'unveiling' as const });
        const result = advanceGeneralStage(source, 20.25);
        assert.isTrue(result.changed);
        assert.equals('adult', result.state.stage);
        assert.equals('unveiling', source.stage);
        assert.equals(1, result.events.length);
        assert.equals('unveiling', result.events[0].from);
        assert.equals('adult', result.events[0].to);
    });

    suite.test('未跨門檻時不變、不發事件', () => {
        const result = advanceGeneralStage({ stage: 'adult' }, 25);
        assert.isFalse(result.changed);
        assert.equals('adult', result.state.stage);
        assert.equals(0, result.events.length);
    });

    suite.test('一次跨多個階段（例如讀檔後快轉）只發一次從舊到新的事件', () => {
        const result = advanceGeneralStage({ stage: 'birth' }, 60);
        assert.equals('decline', result.state.stage);
        assert.equals(1, result.events.length);
        assert.equals('birth', result.events[0].from);
        assert.equals('decline', result.events[0].to);
    });

    suite.test('退役為終態：之後年齡再增加也不變，且不發事件', () => {
        const result = advanceGeneralStage({ stage: 'retired' }, 80);
        assert.equals('retired', result.state.stage);
        assert.isFalse(result.changed);
        assert.equals(0, result.events.length);
    });

    suite.test('年齡倒退時保留原階段，不發事件', () => {
        const result = advanceGeneralStage({ stage: 'peak' }, 30);
        assert.equals('peak', result.state.stage);
        assert.isFalse(result.changed);
    });

    suite.test('存檔還原：合法階段名保留，非法值改由年齡推導', () => {
        assert.equals('peak', restoreGeneralStage({ stage: 'peak' }, 10).stage);
        assert.equals('adult', restoreGeneralStage({ stage: 'bogus' }, 25).stage);
        assert.equals('birth', restoreGeneralStage(null, 3).stage);
        assert.equals('decline', restoreGeneralStage(undefined, 60).stage);
    });

    return suite;
}
