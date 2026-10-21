import { assert, TestSuite } from './TestRunner';
import { createTrialMercenary, MercenaryState, TRIAL_DAYS } from '../assets/scripts/core/systems/MercenaryBond';
import { advanceTrialDay } from '../assets/scripts/core/systems/MercenaryTrialDay';

function trialWith(affection: number | undefined): MercenaryState {
    return { ...createTrialMercenary('merc-1'), affection };
}

export function createMercenaryTrialDaySuite(): TestSuite {
    const suite = new TestSuite('MercenaryTrialDay (MERC-03 六日倒數與每日好感)');

    suite.test('每日推進：倒數 −1、結義進度 +1、好感 +10', () => {
        const result = advanceTrialDay(trialWith(0));
        assert.isTrue(result.ok);
        assert.equals(TRIAL_DAYS - 1, result.state.daysLeft);
        assert.equals(1, result.state.bond);
        assert.equals(10, result.state.affection!);
        assert.equals(10, result.affectionGained);
    });

    suite.test('好感缺省視為 0，推進後寫入 10', () => {
        assert.equals(10, advanceTrialDay(trialWith(undefined)).state.affection!);
    });

    suite.test('好感最大 60：第 7 次加成不再增加', () => {
        const result = advanceTrialDay(trialWith(60));
        assert.equals(60, result.state.affection!);
        assert.equals(0, result.affectionGained);
    });

    suite.test('連續 6 天：倒數歸零、好感滿 60，可結義', () => {
        let state = trialWith(0);
        for (let day = 0; day < TRIAL_DAYS; day++) state = advanceTrialDay(state).state;
        assert.equals(0, state.daysLeft);
        assert.equals(60, state.affection!);
        assert.equals('Trial', state.status);
    });

    suite.test('插畫階段隨好感上升：好感 10 → 階段 1，好感 30 → 階段 3', () => {
        const first = advanceTrialDay(trialWith(0));
        assert.equals(1, first.state.illustrationStage!);
        const third = advanceTrialDay(trialWith(20));
        assert.equals(3, third.state.illustrationStage!);
    });

    suite.test('插畫階段只進不退：既有階段 4 時，好感推出較低階段仍保留 4', () => {
        const state = { ...trialWith(0), illustrationStage: 4 };
        assert.equals(4, advanceTrialDay(state).state.illustrationStage!);
    });

    suite.test('倒數歸零後再推進：回 trial-incomplete，好感不變', () => {
        const done = { ...trialWith(60), daysLeft: 0 };
        const result = advanceTrialDay(done);
        assert.isFalse(result.ok);
        assert.equals('trial-incomplete', result.reason!);
        assert.equals(60, result.state.affection!);
        assert.equals(0, result.affectionGained);
    });

    suite.test('不改輸入', () => {
        const source = trialWith(10);
        advanceTrialDay(source);
        assert.equals(10, source.affection!);
        assert.equals(TRIAL_DAYS, source.daysLeft);
    });

    return suite;
}
