import { assert, TestSuite } from './TestRunner';
import {
    FAREWELL_TEXT_KEY,
    isAvailableForPool,
    MercenaryRecord,
    POOL_COOLDOWN_DAYS,
    settleTrialRollover,
    startCooldownAfterBond,
    startPoolCooldown,
} from '../assets/scripts/core/systems/MercenaryDeparture';

const TRIAL_DONE: MercenaryRecord = Object.freeze({ uid: 'merc-1', status: 'Trial' as const, daysLeft: 0 });

export function createMercenaryDepartureSuite(): TestSuite {
    const suite = new TestSuite('MercenaryDeparture (MERC-05 退場與 30 天冷卻)');

    suite.test('冷卻為 30 天，含結束日當天可再出現', () => {
        assert.equals(30, POOL_COOLDOWN_DAYS);
        const cooldowns = startPoolCooldown([], 'merc-1', 10);
        assert.isFalse(isAvailableForPool('merc-1', 39, cooldowns));
        assert.isTrue(isAvailableForPool('merc-1', 40, cooldowns));
    });

    suite.test('沒有冷卻紀錄的武將可出現在傭兵池', () => {
        assert.isTrue(isAvailableForPool('merc-x', 0, []));
    });

    suite.test('倒數未歸零時 rollover 不離隊，狀態與冷卻不變', () => {
        const record: MercenaryRecord = { uid: 'merc-1', status: 'Trial', daysLeft: 2 };
        const result = settleTrialRollover(record, 5, []);
        assert.isFalse(result.departed);
        assert.equals('Trial', result.record.status);
        assert.equals(0, result.cooldowns.length);
        assert.equals(0, result.events.length);
    });

    suite.test('倒數歸零仍未結義：離隊、發告別信、開始 30 天冷卻', () => {
        const result = settleTrialRollover(TRIAL_DONE, 20, []);
        assert.isTrue(result.departed);
        assert.equals('Expired', result.record.status);
        assert.equals('Trial', TRIAL_DONE.status);
        assert.equals(3, result.events.length);
        assert.equals('departed', result.events[0].type);
        assert.equals('farewell-letter', result.events[1].type);
        assert.equals(FAREWELL_TEXT_KEY, (result.events[1] as { textKey: string }).textKey);
        assert.equals(50, (result.events[2] as { availableOnDay: number }).availableOnDay);
        assert.isFalse(isAvailableForPool('merc-1', 49, result.cooldowns));
    });

    suite.test('已結義者 rollover 不離隊、不發事件', () => {
        const bonded: MercenaryRecord = { uid: 'merc-1', status: 'Bonded', daysLeft: 0 };
        const result = settleTrialRollover(bonded, 20, []);
        assert.isFalse(result.departed);
        assert.equals('Bonded', result.record.status);
        assert.equals(0, result.events.length);
    });

    suite.test('已離隊者重複 rollover 不會重複發告別信', () => {
        const first = settleTrialRollover(TRIAL_DONE, 20, []);
        const second = settleTrialRollover(first.record, 21, first.cooldowns);
        assert.isFalse(second.departed);
        assert.equals(0, second.events.length);
        assert.equals(50, second.cooldowns[0].availableOnDay);
    });

    suite.test('同一武將重複開冷卻時保留較晚的結束日', () => {
        const long = startPoolCooldown([], 'merc-1', 30);
        const shorter = startPoolCooldown(long, 'merc-1', 5);
        assert.equals(1, shorter.length);
        assert.equals(60, shorter[0].availableOnDay);
    });

    suite.test('結義後也開始冷卻，且不改變傭兵狀態', () => {
        const cooldowns = startCooldownAfterBond('merc-2', 12, []);
        assert.equals(42, cooldowns[0].availableOnDay);
        assert.isFalse(isAvailableForPool('merc-2', 41, cooldowns));
    });

    suite.test('非法日序拋出 RangeError', () => {
        assert.throws(() => startPoolCooldown([], 'merc-1', -1));
        assert.throws(() => isAvailableForPool('merc-1', 1.5, []));
        assert.throws(() => settleTrialRollover(TRIAL_DONE, NaN, []));
    });

    return suite;
}
