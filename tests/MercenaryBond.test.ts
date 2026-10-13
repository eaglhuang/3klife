import { assert, TestSuite } from './TestRunner';
import {
    advanceMercenaryDay,
    bondMercenary,
    canBondMercenary,
    createTrialMercenary,
    TRIAL_DAYS,
} from '../assets/scripts/core/systems/MercenaryBond';

export function createMercenaryBondSuite(): TestSuite {
    const suite = new TestSuite('MercenaryBond (MVP-09 傭兵 6 日結義)');

    suite.test('雇傭後為 Trial：6 天倒數、結義進度 0', () => {
        const state = createTrialMercenary('merc-1');
        assert.equals(6, TRIAL_DAYS);
        assert.equals(6, state.daysLeft);
        assert.equals(0, state.bond);
        assert.equals('Trial', state.status);
        assert.isFalse(canBondMercenary(state));
    });

    suite.test('每日推進 bond +1、daysLeft −1，且不修改輸入', () => {
        const source = Object.freeze(createTrialMercenary('merc-1'));
        const result = advanceMercenaryDay(source);
        assert.isTrue(result.ok);
        assert.equals(5, result.state.daysLeft);
        assert.equals(1, result.state.bond);
        assert.equals(6, source.daysLeft);
        assert.equals(0, source.bond);
        assert.isTrue(result.state !== source);
        assert.equals(1, result.events.length);
    });

    suite.test('第 6 天推進後倒數歸零，發出 trial-complete 且可結義', () => {
        let state = createTrialMercenary('merc-1');
        for (let day = 1; day <= 5; day++) {
            const result = advanceMercenaryDay(state);
            assert.equals(0, result.events.filter(e => e.type === 'trial-complete').length);
            state = result.state;
        }
        assert.isFalse(canBondMercenary(state));
        const last = advanceMercenaryDay(state);
        assert.isTrue(last.ok);
        assert.equals(0, last.state.daysLeft);
        assert.equals(6, last.state.bond);
        assert.equals(1, last.events.filter(e => e.type === 'trial-complete').length);
        assert.isTrue(canBondMercenary(last.state));
    });

    suite.test('倒數未完成時結義被拒絕，狀態不變', () => {
        const state = createTrialMercenary('merc-1');
        const result = bondMercenary(state);
        assert.isFalse(result.ok);
        assert.equals('trial-incomplete', result.reason!);
        assert.equals('Trial', result.state.status);
        assert.equals(0, result.events.length);
    });

    suite.test('倒數完成後結義成 Bonded，之後不可再推進或重複結義', () => {
        let state = createTrialMercenary('merc-1');
        for (let day = 0; day < TRIAL_DAYS; day++) state = advanceMercenaryDay(state).state;
        const bonded = bondMercenary(state);
        assert.isTrue(bonded.ok);
        assert.equals('Bonded', bonded.state.status);
        assert.equals('bonded', bonded.events[0].type);

        const advance = advanceMercenaryDay(bonded.state);
        assert.isFalse(advance.ok);
        assert.equals('not-trial', advance.reason!);
        const again = bondMercenary(bonded.state);
        assert.isFalse(again.ok);
        assert.equals('not-trial', again.reason!);
    });

    suite.test('倒數歸零後再推進不會變負數，也不重複發事件', () => {
        let state = createTrialMercenary('merc-1');
        for (let day = 0; day < TRIAL_DAYS; day++) state = advanceMercenaryDay(state).state;
        const extra = advanceMercenaryDay(state);
        assert.isFalse(extra.ok);
        assert.equals('trial-incomplete', extra.reason!);
        assert.equals(0, extra.state.daysLeft);
        assert.equals(6, extra.state.bond);
        assert.equals(0, extra.events.length);
    });

    return suite;
}
