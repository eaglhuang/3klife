/**
 * TournamentBossTicket — 名將挑戰賽 BOSS 挑戰券：每日送 1 張、可加購、消耗（ECO-12；PROG-2-1918）
 */
import { assert, TestSuite } from './TestRunner';
import {
    BOSS_TICKET_MAX_HOLD, addBossTickets, createTournamentState, grantDailyBossTicket, normalizeTournamentState, spendBossTicket,
} from '../assets/scripts/core/systems/TournamentLocal';

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.parse('2026-11-07T04:00:00Z');

export function createTournamentBossTicketSuite(): TestSuite {
    const suite = new TestSuite('TournamentBossTicket (BOSS 挑戰券 ECO-12 PROG-2-1918)');

    suite.test('每日送 1 張、同日不重送；持有上限只限每日贈送', () => {
        let s = createTournamentState(T0);
        assert.equals(0, s.bossTickets ?? 0);
        s = grantDailyBossTicket(s, T0);
        assert.equals(1, s.bossTickets);
        s = grantDailyBossTicket(s, T0 + 3600_000);
        assert.equals(1, s.bossTickets);
        for (let d = 1; d <= 10; d++) s = grantDailyBossTicket(s, T0 + d * DAY);
        assert.equals(BOSS_TICKET_MAX_HOLD, s.bossTickets);
        s = addBossTickets(s, 2);
        assert.equals(BOSS_TICKET_MAX_HOLD + 2, s.bossTickets);
    });

    suite.test('消耗：有券扣 1，沒券拒絕；讀檔保留且擋壞值', () => {
        let s = grantDailyBossTicket(createTournamentState(T0), T0);
        const used = spendBossTicket(s);
        assert.isTrue(used.ok);
        assert.equals(0, used.state.bossTickets);
        assert.isFalse(spendBossTicket(used.state).ok);
        s = normalizeTournamentState(JSON.parse(JSON.stringify(grantDailyBossTicket(s, T0 + DAY))))!;
        assert.equals(2, s.bossTickets);
        assert.equals(s, grantDailyBossTicket(s, T0 + DAY));
        const bad = normalizeTournamentState({ ...createTournamentState(T0), bossTickets: -5, bossTicketDay: 'x' })!;
        assert.equals(0, bad.bossTickets ?? 0);
        assert.equals(undefined, bad.bossTicketDay);
        assert.equals(s.bossTickets, addBossTickets(s, 0).bossTickets);
    });

    return suite;
}
