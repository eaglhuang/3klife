import { assert, TestSuite } from './TestRunner';
import {
    canDeployMercenary,
    canTeachMercenary,
    createUpkeepState,
    FREEZE_GRACE_DAYS,
    repayUpkeep,
    settleUpkeepDay,
    UpkeepCost,
    UpkeepWallet,
} from '../assets/scripts/core/systems/MercenaryUpkeep';

const COST: UpkeepCost = { gold: 100, wine: 1 };
const RICH: UpkeepWallet = { gold: 1000, wine: 5 };

export function createMercenaryUpkeepSuite(): TestSuite {
    const suite = new TestSuite('MercenaryUpkeep (薪水與欠薪凍結)');

    suite.test('付得起時每日扣黃金與美酒，維持 Active', () => {
        const result = settleUpkeepDay(createUpkeepState('merc-1'), RICH, COST);
        assert.equals('Active', result.state.status);
        assert.equals(900, result.wallet.gold);
        assert.equals(4, result.wallet.wine);
        assert.equals(0, result.events.length);
    });

    suite.test('付不起（缺美酒）即凍結，倒數 1 日，不扣錢', () => {
        const result = settleUpkeepDay(createUpkeepState('merc-1'), { gold: 1000, wine: 0 }, COST);
        assert.equals('Frozen', result.state.status);
        assert.equals(FREEZE_GRACE_DAYS, result.state.frozenDaysLeft);
        assert.equals(1, result.state.unpaidDays);
        assert.equals(1000, result.wallet.gold);
        assert.equals('frozen', result.events[0].type);
    });

    suite.test('凍結期間不可出戰、不可教官', () => {
        const frozen = settleUpkeepDay(createUpkeepState('merc-1'), { gold: 0, wine: 0 }, COST).state;
        assert.isFalse(canDeployMercenary(frozen));
        assert.isFalse(canTeachMercenary(frozen));
        assert.isTrue(canDeployMercenary(createUpkeepState('merc-1')));
    });

    suite.test('倒數歸零仍未補繳即離隊，發 departed', () => {
        const frozen = settleUpkeepDay(createUpkeepState('merc-1'), { gold: 0, wine: 0 }, COST).state;
        const result = settleUpkeepDay(frozen, { gold: 0, wine: 0 }, COST);
        assert.equals('Departed', result.state.status);
        assert.equals(0, result.state.frozenDaysLeft);
        assert.equals('departed', result.events[0].type);
        assert.equals('upkeep-unpaid', (result.events[0] as { reason: string }).reason);
    });

    suite.test('離隊後每日結算不再產生事件', () => {
        const departed = { uid: 'merc-1', status: 'Departed' as const, unpaidDays: 2, frozenDaysLeft: 0 };
        const result = settleUpkeepDay(departed, RICH, COST);
        assert.equals('Departed', result.state.status);
        assert.equals(0, result.events.length);
        assert.equals(1000, result.wallet.gold);
    });

    suite.test('倒數期間補足欠款（每欠一日一份）即回到 Active', () => {
        const frozen = settleUpkeepDay(createUpkeepState('merc-1'), { gold: 0, wine: 0 }, COST).state;
        const repaid = repayUpkeep(frozen, { gold: 100, wine: 1 }, COST);
        assert.equals('Active', repaid.state.status);
        assert.equals(0, repaid.state.unpaidDays);
        assert.equals(0, repaid.wallet.gold);
        assert.equals(0, repaid.wallet.wine);
        assert.equals('unfrozen', repaid.events[0].type);
    });

    suite.test('補繳錢不夠時維持凍結，錢包不變', () => {
        const frozen = settleUpkeepDay(createUpkeepState('merc-1'), { gold: 0, wine: 0 }, COST).state;
        const frozenTwice = settleUpkeepDay({ ...frozen, status: 'Frozen', frozenDaysLeft: 2 }, { gold: 0, wine: 0 }, COST).state;
        const repaid = repayUpkeep(frozenTwice, { gold: 150, wine: 2 }, COST);
        assert.equals('Frozen', repaid.state.status);
        assert.equals(150, repaid.wallet.gold);
        assert.equals(0, repaid.events.length);
    });

    suite.test('非凍結狀態呼叫 repayUpkeep 不變動', () => {
        const result = repayUpkeep(createUpkeepState('merc-1'), RICH, COST);
        assert.equals('Active', result.state.status);
        assert.equals(1000, result.wallet.gold);
        assert.equals(0, result.events.length);
    });

    suite.test('輸入不被修改', () => {
        const source = Object.freeze(createUpkeepState('merc-1'));
        const wallet = Object.freeze({ gold: 0, wine: 0 });
        settleUpkeepDay(source, wallet, COST);
        assert.equals('Active', source.status);
        assert.equals(0, wallet.gold);
    });

    suite.test('非法成本拋出 RangeError', () => {
        assert.throws(() => settleUpkeepDay(createUpkeepState('merc-1'), RICH, { gold: -1, wine: 0 }));
        assert.throws(() => repayUpkeep(createUpkeepState('merc-1'), RICH, { gold: 0, wine: NaN }));
    });

    return suite;
}
