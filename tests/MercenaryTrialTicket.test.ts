import { assert, TestSuite } from './TestRunner';
import { TRIAL_DAYS } from '../assets/scripts/core/systems/MercenaryBond';
import {
    scaleTrialStats,
    TRIAL_TICKET_ABILITY_RATIO,
    TrialStats,
    useTrialTicket,
} from '../assets/scripts/core/systems/MercenaryTrialTicket';

const ORIGIN: TrialStats = { STR: 80, INT: 60, POL: 40, CHR: 70, LUK: 50 };

export function createMercenaryTrialTicketSuite(): TestSuite {
    const suite = new TestSuite('MercenaryTrialTicket (MERC-02 試用券產生傭兵)');

    suite.test('能力比例固定為 1.0', () => {
        assert.equals(1, TRIAL_TICKET_ABILITY_RATIO);
    });

    suite.test('有試用券：消耗 1 張並產生 Trial 傭兵，天數為 TRIAL_DAYS', () => {
        const result = useTrialTicket({ trialTickets: 2 }, 'merc-1', ORIGIN);
        assert.isTrue(result.ok);
        assert.equals(1, result.wallet.trialTickets);
        assert.equals('Trial', result.mercenary!.status);
        assert.equals(TRIAL_DAYS, result.mercenary!.daysLeft);
        assert.equals('merc-1', result.mercenary!.uid);
    });

    suite.test('能力數值 = 原值 × 1.0（數值不變）', () => {
        const result = useTrialTicket({ trialTickets: 1 }, 'merc-1', ORIGIN);
        assert.equals(80, result.stats!.STR);
        assert.equals(60, result.stats!.INT);
        assert.equals(40, result.stats!.POL);
        assert.equals(70, result.stats!.CHR);
        assert.equals(50, result.stats!.LUK);
    });

    suite.test('沒有試用券：拒絕，錢包不變且不產生傭兵', () => {
        const wallet = { trialTickets: 0 };
        const result = useTrialTicket(wallet, 'merc-1', ORIGIN);
        assert.isFalse(result.ok);
        assert.equals('no-ticket', result.reason!);
        assert.equals(0, result.wallet.trialTickets);
        assert.isTrue(result.mercenary === undefined);
        assert.isTrue(result.stats === undefined);
    });

    suite.test('比例換算向下取整且不為負', () => {
        const scaled = scaleTrialStats(ORIGIN, 0.5);
        assert.equals(40, scaled.STR);
        assert.equals(30, scaled.INT);
        assert.equals(20, scaled.POL);
        const negative = scaleTrialStats({ ...ORIGIN, LUK: -3 }, 1);
        assert.equals(0, negative.LUK);
    });

    suite.test('輸入錢包與原武將數值不被修改，結果為副本', () => {
        const wallet = Object.freeze({ trialTickets: 1 });
        const origin = Object.freeze({ ...ORIGIN });
        const result = useTrialTicket(wallet, 'merc-1', origin);
        assert.equals(1, wallet.trialTickets);
        assert.equals(80, origin.STR);
        assert.isTrue(result.stats !== origin);
    });

    return suite;
}
