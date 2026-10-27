// @spec-source → 名將挑戰賽系統.md (doc_spec_0007) §F 賽季週期（TOURNAMENT_CONFIG）、配對機制、賽季鏡像快照與鎖定規則、排名積分；PROG-2-1190
/**
 * TournamentLocal — 名將挑戰賽本機最小可行（純邏輯，不依賴 cc）。
 *
 * 伺服端非同步對戰尚未建置，先在本機完成一季的流程：
 *   - 賽季：14 天一季（相位、段位、軟重置沿用 TournamentSeason），首次存取時開季，過季自動 rollover 並留歷史。
 *   - 報名：第一次參戰時凍結出戰陣容為鏡像快照；培育期每日可重登錄 1 次，競賽期整季只可替換 1 次。
 *   - 參戰：只在競賽期；每日免費 1 次，額外每次付費（呼叫端決定扣什麼），每日上限 5 次。
 *   - 對戰：對手戰力在我方 ±15% 內隨機；五戰三勝，每場雙方各帶 ±5% 地形浮動；系列賽勝負套規格 ELO（K=32）。
 *
 * 暫定：對手的排名分以「我方分數 × 對手戰力比」估算；ELO 以整個系列賽算一次；獎勵發放（TRN-10）未做。
 * Unity 對照：像一個存檔用的 ScriptableObject 狀態 + 純函式 reducer。
 */
import { rankTierOf, softResetPoints, tournamentPhaseOf, TOURNAMENT_SEASON_DAYS, type RankTier, type TournamentPhase } from './TournamentSeason';

export const TOURNAMENT_DAY_MS = 24 * 60 * 60 * 1000;

/** 規格 TOURNAMENT_CONFIG 中與本機流程相關的欄位 */
export const TOURNAMENT_LOCAL_CONFIG = {
    dailyFreeEntries: 1,
    extraEntryCost: 30,
    maxDailyEntries: 5,
    matchPowerRange: 0.15,
    terrainVariance: 0.05,
    bestOf: 5,
    winNeeded: 3,
    eloK: 32,
    /** 培育期每日可重登錄次數、競賽期整季可替換次數 */
    preparationDailyReplace: 1,
    competitionReplaceLimit: 1,
} as const;

export interface TournamentTeamSnapshot {
    snapshotId: string;
    seasonIndex: number;
    registeredAtMs: number;
    generals: string[];
    totalPower: number;
}

export interface TournamentSeasonHistory {
    seasonIndex: number;
    finalPoints: number;
    finalTier: RankTier;
    bestWinStreak: number;
    snapshotId: string | null;
}

export interface TournamentState {
    seasonIndex: number;
    seasonStartMs: number;
    points: number;
    team: TournamentTeamSnapshot | null;
    /** 今天是本季第幾日、已參戰幾次 */
    entryDay: number;
    entriesToday: number;
    /** 培育期最後一次重登錄的日、競賽期已替換次數 */
    lastPrepRegisterDay: number;
    competitionReplaces: number;
    winStreak: number;
    bestWinStreak: number;
    history: TournamentSeasonHistory[];
}

export interface TournamentEntrant {
    id: string;
    power: number;
}

export interface TournamentStatus {
    seasonIndex: number;
    phase: TournamentPhase;
    dayInSeason: number;
    daysLeft: number;
    points: number;
    tier: RankTier;
    entriesLeftToday: number;
    team: TournamentTeamSnapshot | null;
}

export function createTournamentState(nowMs: number): TournamentState {
    return {
        seasonIndex: 1, seasonStartMs: nowMs, points: 0, team: null,
        entryDay: 0, entriesToday: 0, lastPrepRegisterDay: -1, competitionReplaces: 0,
        winStreak: 0, bestWinStreak: 0, history: [],
    };
}

export function tournamentDayOf(state: Readonly<TournamentState>, nowMs: number): number {
    return Math.max(0, Math.floor((nowMs - state.seasonStartMs) / TOURNAMENT_DAY_MS));
}

/** 過季就結算：留歷史、軟重置分數、清報名與次數，可能連跨多季 */
export function rolloverTournament(state: Readonly<TournamentState>, nowMs: number): TournamentState {
    let next: TournamentState = { ...state, history: state.history.slice() };
    while (tournamentDayOf(next, nowMs) >= TOURNAMENT_SEASON_DAYS) {
        next.history.push({
            seasonIndex: next.seasonIndex, finalPoints: next.points, finalTier: rankTierOf(next.points),
            bestWinStreak: next.bestWinStreak, snapshotId: next.team?.snapshotId ?? null,
        });
        next = {
            ...next,
            seasonIndex: next.seasonIndex + 1,
            seasonStartMs: next.seasonStartMs + TOURNAMENT_SEASON_DAYS * TOURNAMENT_DAY_MS,
            points: softResetPoints(next.points),
            team: null, entryDay: 0, entriesToday: 0, lastPrepRegisterDay: -1, competitionReplaces: 0,
            winStreak: 0, bestWinStreak: 0,
        };
    }
    return next;
}

function entriesUsedToday(state: Readonly<TournamentState>, day: number): number {
    return state.entryDay === day ? state.entriesToday : 0;
}

export function tournamentStatus(state: Readonly<TournamentState>, nowMs: number): TournamentStatus {
    const day = tournamentDayOf(state, nowMs);
    const phase = tournamentPhaseOf(day);
    return {
        seasonIndex: state.seasonIndex,
        phase,
        dayInSeason: day,
        daysLeft: Math.max(0, TOURNAMENT_SEASON_DAYS - day),
        points: state.points,
        tier: rankTierOf(state.points),
        entriesLeftToday: phase === 'COMPETITION' ? Math.max(0, TOURNAMENT_LOCAL_CONFIG.maxDailyEntries - entriesUsedToday(state, day)) : 0,
        team: state.team ? { ...state.team, generals: state.team.generals.slice() } : null,
    };
}

export type TournamentRegisterReason = 'ended' | 'empty-team' | 'prep-daily-limit' | 'competition-replace-limit';

/** 報名／重登錄：凍結陣容為鏡像快照；依規格限制重登錄次數 */
export function registerTournamentTeam(
    state: Readonly<TournamentState>, entrants: readonly TournamentEntrant[], nowMs: number,
): { ok: true; state: TournamentState } | { ok: false; reason: TournamentRegisterReason } {
    if (entrants.length === 0) return { ok: false, reason: 'empty-team' };
    const day = tournamentDayOf(state, nowMs);
    const phase = tournamentPhaseOf(day);
    if (phase === 'ENDED') return { ok: false, reason: 'ended' };
    let next: TournamentState = { ...state };
    if (state.team) {
        if (phase === 'PREPARATION') {
            if (state.lastPrepRegisterDay === day) return { ok: false, reason: 'prep-daily-limit' };
        } else if (state.competitionReplaces >= TOURNAMENT_LOCAL_CONFIG.competitionReplaceLimit) {
            return { ok: false, reason: 'competition-replace-limit' };
        } else {
            next.competitionReplaces = state.competitionReplaces + 1;
        }
    }
    if (phase === 'PREPARATION') next.lastPrepRegisterDay = day;
    next.team = {
        snapshotId: `TRN_S${state.seasonIndex}_${nowMs}`,
        seasonIndex: state.seasonIndex,
        registeredAtMs: nowMs,
        generals: entrants.map((e) => e.id),
        totalPower: entrants.reduce((sum, e) => sum + Math.max(0, e.power), 0),
    };
    return { ok: true, state: next };
}

/** 規格 calculateEloChange */
export function tournamentEloChange(myRank: number, opponentRank: number, isWin: boolean): number {
    const expected = 1 / (1 + Math.pow(10, (opponentRank - myRank) / 400));
    return Math.round(TOURNAMENT_LOCAL_CONFIG.eloK * ((isWin ? 1 : 0) - expected));
}

export type TournamentEntryReason = 'not-competition' | 'no-team' | 'daily-limit' | 'payment-declined';

export interface TournamentSeriesResult {
    win: boolean;
    games: boolean[];
    opponentPower: number;
    opponentPoints: number;
    pointsDelta: number;
    pointsAfter: number;
    tierAfter: RankTier;
    paidExtra: boolean;
}

/**
 * 參戰一次：五戰三勝的系列賽。第一次參戰而未報名時，用 entrants 自動報名（報名即鎖定）。
 * 當日免費次數用完後，呼叫 payExtra(cost) 決定是否付費；回傳 false 視為取消。
 */
export function playTournamentSeries(
    state: Readonly<TournamentState>,
    entrants: readonly TournamentEntrant[],
    nowMs: number,
    random: () => number,
    payExtra: (cost: number) => boolean = () => false,
): { ok: true; state: TournamentState; result: TournamentSeriesResult } | { ok: false; reason: TournamentEntryReason } {
    const cfg = TOURNAMENT_LOCAL_CONFIG;
    const day = tournamentDayOf(state, nowMs);
    if (tournamentPhaseOf(day) !== 'COMPETITION') return { ok: false, reason: 'not-competition' };
    let next: TournamentState = { ...state };
    if (!next.team) {
        const registered = registerTournamentTeam(next, entrants, nowMs);
        if (!registered.ok) return { ok: false, reason: 'no-team' };
        next = registered.state;
    }
    const used = entriesUsedToday(next, day);
    if (used >= cfg.maxDailyEntries) return { ok: false, reason: 'daily-limit' };
    const paidExtra = used >= cfg.dailyFreeEntries;
    if (paidExtra && !payExtra(cfg.extraEntryCost)) return { ok: false, reason: 'payment-declined' };

    const myPower = Math.max(1, next.team!.totalPower);
    const opponentPower = Math.round(myPower * (1 - cfg.matchPowerRange + random() * cfg.matchPowerRange * 2));
    const opponentPoints = Math.max(0, Math.round(next.points * opponentPower / myPower));
    const games: boolean[] = [];
    let wins = 0;
    let losses = 0;
    while (wins < cfg.winNeeded && losses < cfg.winNeeded && games.length < cfg.bestOf) {
        const mine = myPower * (1 - cfg.terrainVariance + random() * cfg.terrainVariance * 2);
        const theirs = opponentPower * (1 - cfg.terrainVariance + random() * cfg.terrainVariance * 2);
        const won = mine >= theirs;
        games.push(won);
        if (won) wins++; else losses++;
    }
    const win = wins >= cfg.winNeeded;
    const pointsDelta = tournamentEloChange(next.points, opponentPoints, win);
    const pointsAfter = Math.max(0, next.points + pointsDelta);
    const winStreak = win ? next.winStreak + 1 : 0;
    next = {
        ...next,
        points: pointsAfter,
        entryDay: day,
        entriesToday: used + 1,
        winStreak,
        bestWinStreak: Math.max(next.bestWinStreak, winStreak),
    };
    return {
        ok: true,
        state: next,
        result: { win, games, opponentPower, opponentPoints, pointsDelta, pointsAfter: pointsAfter, tierAfter: rankTierOf(pointsAfter), paidExtra },
    };
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** 存檔正規化；壞資料回 null（呼叫端下次存取時重新開季） */
export function normalizeTournamentState(raw: unknown): TournamentState | null {
    if (!raw || typeof raw !== 'object') return null;
    const s = raw as Partial<TournamentState>;
    if (!isNum(s.seasonIndex) || !isNum(s.seasonStartMs) || !isNum(s.points)) return null;
    const team = s.team && typeof s.team === 'object' && typeof s.team.snapshotId === 'string' && Array.isArray(s.team.generals) && isNum(s.team.totalPower)
        ? {
            snapshotId: s.team.snapshotId, seasonIndex: isNum(s.team.seasonIndex) ? s.team.seasonIndex : s.seasonIndex,
            registeredAtMs: isNum(s.team.registeredAtMs) ? s.team.registeredAtMs : s.seasonStartMs,
            generals: s.team.generals.filter((g): g is string => typeof g === 'string'), totalPower: s.team.totalPower,
        }
        : null;
    const history = Array.isArray(s.history)
        ? s.history.filter((h): h is TournamentSeasonHistory => !!h && isNum(h.seasonIndex) && isNum(h.finalPoints))
            .map((h) => ({ seasonIndex: h.seasonIndex, finalPoints: h.finalPoints, finalTier: rankTierOf(h.finalPoints),
                bestWinStreak: isNum(h.bestWinStreak) ? h.bestWinStreak : 0, snapshotId: typeof h.snapshotId === 'string' ? h.snapshotId : null }))
        : [];
    return {
        seasonIndex: s.seasonIndex, seasonStartMs: s.seasonStartMs, points: Math.max(0, s.points), team,
        entryDay: isNum(s.entryDay) ? s.entryDay : 0, entriesToday: isNum(s.entriesToday) ? s.entriesToday : 0,
        lastPrepRegisterDay: isNum(s.lastPrepRegisterDay) ? s.lastPrepRegisterDay : -1,
        competitionReplaces: isNum(s.competitionReplaces) ? s.competitionReplaces : 0,
        winStreak: isNum(s.winStreak) ? s.winStreak : 0, bestWinStreak: isNum(s.bestWinStreak) ? s.bestWinStreak : 0,
        history,
    };
}
