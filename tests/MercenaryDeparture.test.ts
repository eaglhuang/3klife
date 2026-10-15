import { assert, TestSuite } from './TestRunner';
import { createUpkeepState, settleUpkeepDay, FREEZE_GRACE_DAYS } from '../assets/scripts/core/systems/MercenaryUpkeep';
import {
    FAREWELL_TEXT_KEY,
    isAvailableForPool,
    MercenaryRecord,
    POOL_COOLDOWN_DAYS,
    settleTrialRollover,
    settleUpkeepDeparture,
    startCooldownAfterBond,
    startPoolCooldown,
    isGeneralAvailableForPool,
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

    suite.test('薪水欠款離隊：發離隊、告別信與冷卻事件', () => {
        const result = settleUpkeepDeparture([{ type: 'departed', uid: 'merc-1', reason: 'upkeep-unpaid' }], 10, []);
        assert.isTrue(result.departed);
        assert.equals(3, result.events.length);
        assert.equals('departed', result.events[0].type);
        assert.equals('upkeep-unpaid', (result.events[0] as { reason: string }).reason);
        assert.equals('farewell-letter', result.events[1].type);
        assert.equals(FAREWELL_TEXT_KEY, (result.events[1] as { textKey: string }).textKey);
        assert.equals(10 + POOL_COOLDOWN_DAYS, (result.events[2] as { availableOnDay: number }).availableOnDay);
        assert.isFalse(isAvailableForPool('merc-1', 10, result.cooldowns));
    });

    suite.test('沒有離隊事件時不產生離隊事件，冷卻不變', () => {
        const before: { uid: string; availableOnDay: number }[] = [{ uid: 'merc-2', availableOnDay: 50 }];
        const result = settleUpkeepDeparture([{ type: 'frozen', uid: 'merc-1' }], 10, before);
        assert.isFalse(result.departed);
        assert.equals(0, result.events.length);
        assert.equals(1, result.cooldowns.length);
        assert.equals(50, result.cooldowns[0].availableOnDay);
    });

    suite.test('非薪水原因的離隊事件不接線', () => {
        const result = settleUpkeepDeparture([{ type: 'departed', uid: 'merc-1', reason: 'trial-expired' }], 10, []);
        assert.isFalse(result.departed);
        assert.equals(0, result.events.length);
    });

    suite.test('完整流程：欠薪凍結、倒數歸零後離隊，接上告別信與 30 天冷卻', () => {
        const cost = { gold: 10, wine: 1 };
        let state = createUpkeepState('merc-1');
        let wallet = { gold: 0, wine: 0 };
        const frozen = settleUpkeepDay(state, wallet, cost);
        assert.equals('Frozen', frozen.state.status);
        state = frozen.state;
        let departedEvents: { type: string; uid: string; reason?: string }[] = [];
        for (let day = 0; day < FREEZE_GRACE_DAYS + 1; day++) {
            const next = settleUpkeepDay(state, wallet, cost);
            state = next.state;
            wallet = next.wallet;
            departedEvents = departedEvents.concat(next.events);
        }
        assert.equals('Departed', state.status);
        const result = settleUpkeepDeparture(departedEvents, 20, []);
        assert.isTrue(result.departed);
        assert.equals(3, result.events.length);
        assert.isFalse(isAvailableForPool('merc-1', 20 + POOL_COOLDOWN_DAYS - 1, result.cooldowns));
        assert.isTrue(isAvailableForPool('merc-1', 20 + POOL_COOLDOWN_DAYS, result.cooldowns));
    });

    suite.test('同武將 30 天內不再出現：換新 uid 的傭兵也擋下（以武將為單位）', () => {
        const expired = settleTrialRollover({ ...TRIAL_DONE, generalId: 'gen-1' }, 20, []);
        assert.isFalse(isGeneralAvailableForPool('gen-1', 49, expired.cooldowns));
        assert.isTrue(isGeneralAvailableForPool('gen-1', 50, expired.cooldowns));
        assert.isTrue(isGeneralAvailableForPool('gen-2', 49, expired.cooldowns));
    });

    suite.test('舊冷卻紀錄沒有 generalId 時不擋任何武將', () => {
        const legacy = startPoolCooldown([], 'merc-1', 10);
        assert.isTrue(isGeneralAvailableForPool('gen-1', 11, legacy));
    });

    suite.test('結義也寫入武將冷卻：startCooldownAfterBond 帶 generalId', () => {
        const cooldowns = startCooldownAfterBond('merc-1', 10, [], 'gen-1');
        assert.isFalse(isGeneralAvailableForPool('gen-1', 39, cooldowns));
        assert.isTrue(isGeneralAvailableForPool('gen-1', 40, cooldowns));
    });

    return suite;
}
