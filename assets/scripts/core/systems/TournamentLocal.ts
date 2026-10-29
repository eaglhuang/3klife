// @spec-source → 名將挑戰賽系統.md (doc_spec_0007) §F 賽季週期（TOURNAMENT_CONFIG）、配對機制、賽季鏡像快照與鎖定規則、排名積分；PROG-2-1190；§E-9 賽季獎勵 PROG-2-1194；§E-2 場地屬性公告、§A 杯賽命名 PROG-2-1195；§E-8／§F 季節 BOSS PROG-2-1196
/**
 * TournamentLocal — 名將挑戰賽本機最小可行（純邏輯，不依賴 cc）。
 *
 * 伺服端非同步對戰尚未建置，先在本機完成一季的流程：
 *   - 賽季：14 天一季（相位、段位、軟重置沿用 TournamentSeason），首次存取時開季，過季自動 rollover 並留歷史。
 *   - 報名：第一次參戰時凍結出戰陣容為鏡像快照；培育期每日可重登錄 1 次，競賽期整季只可替換 1 次。
 *   - 參戰：只在競賽期；每日免費 1 次，額外每次付費（呼叫端決定扣什麼），每日上限 5 次。
 *   - 對戰：對手戰力在我方 ±15% 內隨機；五戰三勝，每場雙方各帶 ±5% 地形浮動；系列賽勝負套規格 ELO（K=32）。
 *   - 場地：每季依序號輪替一個杯賽（杯名＋地形＋天氣），培育期即公告（PROG-2-1195）。
 *   - BOSS：每個杯賽帶一個季節 BOSS 與弱點標籤，攻擊標籤命中弱點 ×1.5（PROG-2-1196；BOSS 戰需伺服器，未做）。
 *   - 獎勵：有參賽（留有鏡像快照）的已結束賽季依最終段位列為待領，領取後標記已領（PROG-2-1194）。
 *
 * 暫定：對手的排名分以「我方分數 × 對手戰力比」估算；ELO 以整個系列賽算一次；獎勵先只發金錢（稀有虎符／限定外觀待企劃）。
 * Unity 對照：像一個存檔用的 ScriptableObject 狀態 + 純函式 reducer。
 */
import { TerrainType, Weather } from '../../shared/CommonEnums';
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

/**
 * 單機對戰樹（PROG-2-1575，暫定 4 輪）：初賽、複賽、準決賽五戰三勝，決賽一場定勝負。
 * 贏一輪晉級；輸了回到初賽；奪冠後記一次冠軍並從初賽重來。
 */
export const TOURNAMENT_BRACKET_ROUNDS = ['初賽', '複賽', '準決賽', '決賽'] as const;
export const TOURNAMENT_FINAL_ROUND = TOURNAMENT_BRACKET_ROUNDS.length - 1;

/** 該輪的局數與勝場門檻：決賽單場，其餘五戰三勝 */
export function bracketSeriesRule(round: number): { bestOf: number; winNeeded: number } {
    return round >= TOURNAMENT_FINAL_ROUND
        ? { bestOf: 1, winNeeded: 1 }
        : { bestOf: TOURNAMENT_LOCAL_CONFIG.bestOf, winNeeded: TOURNAMENT_LOCAL_CONFIG.winNeeded };
}

/** BOSS 弱點／攻擊標籤（規格例：SLOW、ANTI_CONTROL、FIRE；其餘為暫定） */
export type TournamentBossTag = 'FIRE' | 'SLOW' | 'ANTI_CONTROL' | 'ANTI_CAVALRY' | 'RANGED';

/** 標籤中文名（暫定） */
export const TOURNAMENT_BOSS_TAG_LABEL: Readonly<Record<TournamentBossTag, string>> = {
    FIRE: '火攻',
    SLOW: '緩速',
    ANTI_CONTROL: '破控',
    ANTI_CAVALRY: '剋騎',
    RANGED: '遠射',
};

/** 攻擊標籤命中 BOSS 弱點時的傷害倍率（規格 BOSS_WEAKNESS_BONUS） */
export const BOSS_WEAKNESS_BONUS = 1.5;

/** 季節 BOSS（規格 SeasonBoss） */
export interface TournamentSeasonBoss {
    bossId: string;
    name: string;
    weaknessTags: TournamentBossTag[];
    basePower: number;
}

/** 杯賽場地：杯名、地形、天氣、季節 BOSS */
export interface TournamentVenue {
    cupName: string;
    terrain: TerrainType;
    weather: Weather;
    boss: TournamentSeasonBoss;
    /** 九州盃特殊規則（規格 §K，PROG-2-1612）：攻擊標籤 → 戰力倍率；規則文字供畫面顯示 */
    specialRule?: { label: string; tagMultipliers: Readonly<Record<string, number>> };
}

/**
 * 杯賽輪替表（依賽季序號循環）。赤壁／官渡／虎牢／夷陵沿用規格 §K 地形天氣；
 * 武將盃與長坂盃的場地、以及輪替順序為暫定；BOSS 名稱、弱點與基礎戰力（10000）全為暫定。
 */
export const TOURNAMENT_CUPS: readonly TournamentVenue[] = [
    { cupName: '赤壁盃', terrain: TerrainType.River, weather: Weather.Windy,
        specialRule: { label: '火攻傷害 ×2', tagMultipliers: { FIRE: 2 } },
        boss: { bossId: 'boss-1', name: '連環戰船', weaknessTags: ['FIRE', 'RANGED'], basePower: 10000 } },
    { cupName: '張飛盃', terrain: TerrainType.Mountain, weather: Weather.Clear,
        boss: { bossId: 'boss-2', name: '燕人猛將', weaknessTags: ['SLOW', 'ANTI_CONTROL'], basePower: 10000 } },
    { cupName: '官渡盃', terrain: TerrainType.Plain, weather: Weather.Clear,
        specialRule: { label: '騎兵衝鋒傷害 ×1.8', tagMultipliers: { CAVALRY: 1.8 } },
        boss: { bossId: 'boss-3', name: '袁軍重騎', weaknessTags: ['ANTI_CAVALRY', 'FIRE'], basePower: 10000 } },
    { cupName: '呂布盃', terrain: TerrainType.Fortress, weather: Weather.Thunder,
        boss: { bossId: 'boss-4', name: '飛將無雙', weaknessTags: ['SLOW', 'ANTI_CAVALRY'], basePower: 10000 } },
    { cupName: '虎牢盃', terrain: TerrainType.Mountain, weather: Weather.Night,
        specialRule: { label: '單挑武力直接結算', tagMultipliers: {} },
        boss: { bossId: 'boss-5', name: '虎牢關守軍', weaknessTags: ['RANGED', 'ANTI_CONTROL'], basePower: 10000 } },
    { cupName: '趙雲盃', terrain: TerrainType.Plain, weather: Weather.Windy,
        boss: { bossId: 'boss-6', name: '白馬銀槍', weaknessTags: ['ANTI_CAVALRY', 'SLOW'], basePower: 10000 } },
    { cupName: '夷陵盃', terrain: TerrainType.Forest, weather: Weather.Rain,
        specialRule: { label: '弓兵射程減半；谷地陷阱觸發率 ×2', tagMultipliers: { RANGED: 0.5, TRAP: 2 } },
        boss: { bossId: 'boss-7', name: '連營大軍', weaknessTags: ['FIRE', 'SLOW'], basePower: 10000 } },
    { cupName: '長坂盃', terrain: TerrainType.Plain, weather: Weather.Fog,
        boss: { bossId: 'boss-8', name: '虎豹騎', weaknessTags: ['ANTI_CAVALRY', 'RANGED'], basePower: 10000 } },
];

/** 第 N 季的杯賽場地（N 從 1 起） */
export function tournamentVenueOf(seasonIndex: number): TournamentVenue {
    const n = TOURNAMENT_CUPS.length;
    const cup = TOURNAMENT_CUPS[(((Math.floor(seasonIndex) - 1) % n) + n) % n];
    return { ...cup, boss: { ...cup.boss, weaknessTags: cup.boss.weaknessTags.slice() } };
}

/**
 * 九州盃特殊規則戰力倍率（PROG-2-1612 暫定）：武將攻擊標籤命中規則的標籤時相乘；沒有規則或沒命中為 1。
 * 虎牢盃「單挑武力直接結算」目前只顯示規則，不改戰力。
 */
export function cupSpecialPowerMultiplier(venue: Readonly<TournamentVenue>, attackTags: readonly string[] | undefined): number {
    const table = venue.specialRule?.tagMultipliers ?? {};
    return (attackTags ?? []).reduce((mult, tag) => mult * (table[tag] ?? 1), 1);
}

/** 攻擊標籤命中 BOSS 任一弱點 → ×1.5，否則 ×1 */
export function bossWeaknessMultiplier(attackTags: readonly string[], boss: Readonly<TournamentSeasonBoss>): number {
    return attackTags.some((tag) => (boss.weaknessTags as readonly string[]).includes(tag)) ? BOSS_WEAKNESS_BONUS : 1;
}

/** 賽季獎勵（暫定，只發金錢）：依最終段位 */
export const TOURNAMENT_SEASON_REWARD_GOLD: Readonly<Record<RankTier, number>> = {
    BRONZE: 100,
    SILVER: 200,
    GOLD: 400,
    PLATINUM: 700,
    DIAMOND: 1000,
    LEGEND: 1500,
};

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
    /** 賽季獎勵已領（PROG-2-1194） */
    rewardClaimed: boolean;
}

export interface TournamentSeasonReward {
    seasonIndex: number;
    tier: RankTier;
    gold: number;
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
    /** 對戰樹目前輪次（0=初賽 … 3=決賽）與本季奪冠次數（PROG-2-1575） */
    bracketRound: number;
    championships: number;
}

export interface TournamentEntrant {
    id: string;
    power: number;
    /** 攻擊標籤（FIRE／CAVALRY／RANGED／TRAP…）；九州盃特殊規則用（PROG-2-1612），缺省不套 */
    attackTags?: readonly string[];
}

export interface TournamentStatus {
    seasonIndex: number;
    venue: TournamentVenue;
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
        winStreak: 0, bestWinStreak: 0, history: [], bracketRound: 0, championships: 0,
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
            bestWinStreak: next.bestWinStreak, snapshotId: next.team?.snapshotId ?? null, rewardClaimed: false,
        });
        next = {
            ...next,
            seasonIndex: next.seasonIndex + 1,
            seasonStartMs: next.seasonStartMs + TOURNAMENT_SEASON_DAYS * TOURNAMENT_DAY_MS,
            points: softResetPoints(next.points),
            team: null, entryDay: 0, entriesToday: 0, lastPrepRegisterDay: -1, competitionReplaces: 0,
            winStreak: 0, bestWinStreak: 0, bracketRound: 0, championships: 0,
        };
    }
    return next;
}

function entriesUsedToday(state: Readonly<TournamentState>, day: number): number {
    return state.entryDay === day ? state.entriesToday : 0;
}

/** 待領的賽季獎勵：已結束、有參賽（有鏡像快照）、尚未領 */
export function pendingTournamentRewards(state: Readonly<TournamentState>): TournamentSeasonReward[] {
    return state.history
        .filter((h) => h.snapshotId !== null && !h.rewardClaimed)
        .map((h) => ({ seasonIndex: h.seasonIndex, tier: h.finalTier, gold: TOURNAMENT_SEASON_REWARD_GOLD[h.finalTier] }));
}

/** 領取全部待領獎勵；回傳新狀態與領到的清單 */
export function claimTournamentRewards(state: Readonly<TournamentState>): { state: TournamentState; rewards: TournamentSeasonReward[] } {
    const rewards = pendingTournamentRewards(state);
    if (rewards.length === 0) return { state: { ...state, history: state.history.slice() }, rewards };
    const history = state.history.map((h) => (h.snapshotId !== null && !h.rewardClaimed ? { ...h, rewardClaimed: true } : h));
    return { state: { ...state, history }, rewards };
}

export function tournamentStatus(state: Readonly<TournamentState>, nowMs: number): TournamentStatus {
    const day = tournamentDayOf(state, nowMs);
    const phase = tournamentPhaseOf(day);
    return {
        seasonIndex: state.seasonIndex,
        venue: tournamentVenueOf(state.seasonIndex),
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
    const venue = tournamentVenueOf(state.seasonIndex);
    next.team = {
        snapshotId: `TRN_S${state.seasonIndex}_${nowMs}`,
        seasonIndex: state.seasonIndex,
        registeredAtMs: nowMs,
        generals: entrants.map((e) => e.id),
        totalPower: Math.round(entrants.reduce((sum, e) => sum + Math.max(0, e.power) * cupSpecialPowerMultiplier(venue, e.attackTags), 0)),
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
    /** 本場所在輪次、是否因此奪冠 */
    round: number;
    champion: boolean;
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
    const round = Math.min(TOURNAMENT_FINAL_ROUND, Math.max(0, next.bracketRound));
    const rule = bracketSeriesRule(round);
    while (wins < rule.winNeeded && losses < rule.winNeeded && games.length < rule.bestOf) {
        const mine = myPower * (1 - cfg.terrainVariance + random() * cfg.terrainVariance * 2);
        const theirs = opponentPower * (1 - cfg.terrainVariance + random() * cfg.terrainVariance * 2);
        const won = mine >= theirs;
        games.push(won);
        if (won) wins++; else losses++;
    }
    const win = wins >= rule.winNeeded;
    const champion = win && round === TOURNAMENT_FINAL_ROUND;
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
        bracketRound: win && !champion ? round + 1 : 0,
        championships: next.championships + (champion ? 1 : 0),
    };
    return {
        ok: true,
        state: next,
        result: { win, games, opponentPower, opponentPoints, pointsDelta, pointsAfter: pointsAfter, tierAfter: rankTierOf(pointsAfter), paidExtra, round, champion },
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
                bestWinStreak: isNum(h.bestWinStreak) ? h.bestWinStreak : 0, snapshotId: typeof h.snapshotId === 'string' ? h.snapshotId : null,
                rewardClaimed: h.rewardClaimed === true }))
        : [];
    return {
        seasonIndex: s.seasonIndex, seasonStartMs: s.seasonStartMs, points: Math.max(0, s.points), team,
        entryDay: isNum(s.entryDay) ? s.entryDay : 0, entriesToday: isNum(s.entriesToday) ? s.entriesToday : 0,
        lastPrepRegisterDay: isNum(s.lastPrepRegisterDay) ? s.lastPrepRegisterDay : -1,
        competitionReplaces: isNum(s.competitionReplaces) ? s.competitionReplaces : 0,
        winStreak: isNum(s.winStreak) ? s.winStreak : 0, bestWinStreak: isNum(s.bestWinStreak) ? s.bestWinStreak : 0,
        history,
        bracketRound: isNum(s.bracketRound) ? Math.min(TOURNAMENT_FINAL_ROUND, Math.max(0, Math.floor(s.bracketRound))) : 0,
        championships: isNum(s.championships) ? Math.max(0, Math.floor(s.championships)) : 0,
    };
}
