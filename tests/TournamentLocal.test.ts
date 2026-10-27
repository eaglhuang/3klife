/**
 * TournamentLocal.test.ts — 名將挑戰賽本機賽季：報名快照、參戰次數、五戰三勝、ELO、rollover（PROG-2-1190）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import {
    claimTournamentRewards, createTournamentState, normalizeTournamentState, pendingTournamentRewards, playTournamentSeries,
    registerTournamentTeam, rolloverTournament, tournamentEloChange, TOURNAMENT_SEASON_REWARD_GOLD, tournamentStatus, TOURNAMENT_DAY_MS, TOURNAMENT_LOCAL_CONFIG, type TournamentState,
} from '../assets/scripts/core/systems/TournamentLocal';

const D = TOURNAMENT_DAY_MS;
const TEAM = [{ id: 'a', power: 100 }, { id: 'b', power: 80 }];
const even = (): number => 0.5;
const strongFoe = (): number => 0.99;

function hero(id: string, name: string, str: number): GeneralConfig {
    return { id, name, faction: 'shu', hp: 1000, str, int: 60, lea: 60, pol: 60, cha: 60 } as unknown as GeneralConfig;
}

function played(state: TournamentState, nowMs: number, random: () => number, payExtra?: (cost: number) => boolean): TournamentState {
    const result = playTournamentSeries(state, TEAM, nowMs, random, payExtra);
    if (!result.ok) throw new Error('expected play ok');
    return result.state;
}

export function createTournamentLocalSuite(): TestSuite {
    const suite = new TestSuite('TournamentLocal (PROG-2-1190 名將挑戰賽本機賽季)');

    suite.test('培育期不能參戰；競賽期首次參戰自動報名並鎖定陣容', () => {
        const state = createTournamentState(0);
        const early = playTournamentSeries(state, TEAM, 3 * D, even);
        assert.isTrue(!early.ok && early.reason === 'not-competition');
        const next = played(state, 7 * D, even);
        assert.equals('a,b', next.team!.generals.join(','));
        assert.equals(180, next.team!.totalPower);
        assert.equals(1, next.entriesToday);
    });

    suite.test('每日免費 1 次，之後付費；拒付取消、上限 5 次', () => {
        let state = played(createTournamentState(0), 7 * D, even);
        const declined = playTournamentSeries(state, TEAM, 7 * D, even);
        assert.isTrue(!declined.ok && declined.reason === 'payment-declined');
        const costs: number[] = [];
        for (let i = 0; i < 4; i++) state = played(state, 7 * D, even, (cost) => { costs.push(cost); return true; });
        assert.equals(`${TOURNAMENT_LOCAL_CONFIG.extraEntryCost}`, Array.from(new Set(costs)).join(','));
        const capped = playTournamentSeries(state, TEAM, 7 * D, even, () => true);
        assert.isTrue(!capped.ok && capped.reason === 'daily-limit');
        assert.equals(0, tournamentStatus(state, 7 * D).entriesLeftToday);
        assert.equals(5, tournamentStatus(state, 8 * D).entriesLeftToday);
        assert.isTrue(playTournamentSeries(state, TEAM, 8 * D, even).ok);
    });

    suite.test('五戰三勝：同戰力我方先拿三勝；強敵三連敗；分數不低於 0', () => {
        const state = createTournamentState(0);
        const win = playTournamentSeries(state, TEAM, 7 * D, even);
        assert.isTrue(win.ok && win.result.win && win.result.games.length === 3 && win.result.pointsDelta === 16);
        const lose = playTournamentSeries(state, TEAM, 7 * D, strongFoe);
        assert.isTrue(lose.ok && !lose.result.win && lose.result.games.join(',') === 'false,false,false');
        assert.isTrue(lose.ok && lose.result.pointsAfter === 0);
    });

    suite.test('ELO：同分勝 +16 負 -16；以弱勝強加更多', () => {
        assert.equals(16, tournamentEloChange(1000, 1000, true));
        assert.equals(-16, tournamentEloChange(1000, 1000, false));
        assert.isTrue(tournamentEloChange(1000, 1400, true) > 16);
    });

    suite.test('連勝與最佳連勝；敗場歸零', () => {
        let state = played(createTournamentState(0), 7 * D, even);
        state = played(state, 8 * D, even);
        state = played(state, 9 * D, strongFoe);
        assert.equals(0, state.winStreak);
        assert.equals(2, state.bestWinStreak);
    });

    suite.test('報名限制：培育期每日 1 次、競賽期整季可替換 1 次、空陣容拒絕', () => {
        const base = createTournamentState(0);
        assert.isTrue(!registerTournamentTeam(base, [], 0).ok);
        const first = registerTournamentTeam(base, TEAM, 0);
        if (!first.ok) throw new Error('register');
        const sameDay = registerTournamentTeam(first.state, TEAM, D / 2);
        assert.isTrue(!sameDay.ok && sameDay.reason === 'prep-daily-limit');
        const nextDay = registerTournamentTeam(first.state, TEAM, D);
        if (!nextDay.ok) throw new Error('next day');
        const replace = registerTournamentTeam(nextDay.state, TEAM, 7 * D);
        if (!replace.ok) throw new Error('replace');
        const again = registerTournamentTeam(replace.state, TEAM, 8 * D);
        assert.isTrue(!again.ok && again.reason === 'competition-replace-limit');
    });

    suite.test('過季結算：留歷史、軟重置分數、清報名；可連跨多季', () => {
        const state: TournamentState = { ...played(createTournamentState(0), 7 * D, even), points: 2000 };
        const next = rolloverTournament(state, 30 * D);
        assert.equals(3, next.seasonIndex);
        assert.equals(2, next.history.length);
        assert.equals('PLATINUM', next.history[0].finalTier);
        assert.equals(1850, next.history[1].finalPoints);
        assert.isTrue(next.team === null && next.entriesToday === 0);
        assert.equals(2 * D, 30 * D - next.seasonStartMs);
    });

    suite.test('賽季獎勵：只發有參賽的已結束賽季，依最終段位；領後清空（PROG-2-1194）', () => {
        const state: TournamentState = { ...played(createTournamentState(0), 7 * D, even), points: 2000 };
        const next = rolloverTournament(state, 30 * D);
        const pending = pendingTournamentRewards(next);
        assert.equals(1, pending.length);
        assert.equals(1, pending[0].seasonIndex);
        assert.equals('PLATINUM', pending[0].tier);
        assert.equals(TOURNAMENT_SEASON_REWARD_GOLD.PLATINUM, pending[0].gold);
        const claimed = claimTournamentRewards(next);
        assert.equals(1, claimed.rewards.length);
        assert.equals(0, pendingTournamentRewards(claimed.state).length);
        assert.equals(1, pendingTournamentRewards(next).length);
        assert.equals(0, claimTournamentRewards(claimed.state).rewards.length);
        assert.equals(0, pendingTournamentRewards(createTournamentState(0)).length);
    });

    suite.test('GameSession：領賽季獎勵入帳、存讀檔保留已領（PROG-2-1194）', () => {
        const session = new GameSession(1);
        session.enrollGenerals([hero('x', '甲', 90)]);
        session.tournamentStatus(0);
        assert.isTrue(session.playTournament(7 * D).ok);
        assert.equals(1, session.pendingTournamentRewards(14 * D).length);
        const reloaded = new GameSession(1);
        reloaded.restoreLifespanState(JSON.parse(JSON.stringify(session.createSnapshot(new Date(0)))) as PlayerSaveSnapshot);
        let gold = 0;
        assert.equals(1, reloaded.claimTournamentRewards(14 * D, (g) => { gold += g; }).length);
        assert.isTrue(gold >= TOURNAMENT_SEASON_REWARD_GOLD.BRONZE);
        const again = new GameSession(1);
        again.restoreLifespanState(JSON.parse(JSON.stringify(reloaded.createSnapshot(new Date(0)))) as PlayerSaveSnapshot);
        assert.equals(0, again.pendingTournamentRewards(14 * D).length);
    });

    suite.test('存檔正規化：壞資料回 null，缺欄位補預設', () => {
        assert.isTrue(normalizeTournamentState(null) === null);
        assert.isTrue(normalizeTournamentState({ seasonIndex: 'x' }) === null);
        const fixed = normalizeTournamentState({ seasonIndex: 2, seasonStartMs: 0, points: -5, team: { bad: 1 } })!;
        assert.equals(0, fixed.points);
        assert.isTrue(fixed.team === null);
        assert.equals(0, fixed.history.length);
    });

    suite.test('GameSession：陣容取戰力前 3、參戰後存讀檔保留', () => {
        const session = new GameSession(1);
        session.enrollGenerals([hero('w', '弱', 10), hero('x', '甲', 90), hero('y', '乙', 80), hero('z', '丙', 70)]);
        assert.equals('PREPARATION', session.tournamentStatus(0).phase);
        assert.isTrue(session.registerTournament(0).ok);
        assert.equals('x,y,z', session.tournamentStatus(0).team!.generals.join(','));
        assert.isTrue(session.playTournament(7 * D).ok);
        assert.equals('payment-declined', session.playTournament(7 * D).reason ?? '');

        const snapshot = JSON.parse(JSON.stringify(session.createSnapshot(new Date(0)))) as PlayerSaveSnapshot;
        assert.isTrue(snapshot.tournament !== undefined);
        const restored = new GameSession(1);
        restored.restoreLifespanState(snapshot);
        assert.equals(4, restored.tournamentStatus(7 * D).entriesLeftToday);
        assert.equals(0, restored.tournamentHistory.length);
        assert.equals(2, restored.tournamentStatus(20 * D).seasonIndex);
        assert.equals(1, restored.tournamentHistory.length);
    });

    suite.test('新遊戲未開季時存檔不寫入欄位', () => {
        assert.isTrue(new GameSession(1).createSnapshot(new Date(0)).tournament === undefined);
    });

    return suite;
}
