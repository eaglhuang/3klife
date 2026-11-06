// @spec-source → 官職系統.md (doc_spec_0014) 覆寫裁定「玩家官職與武將將階分離」；數值系統.md「General_Fame -> General_Rank -> Command_Capacity」；PROG-2-1898
/**
 * GeneralRankProgress — 武將名聲（General_Fame）累積與將階（General_Rank）晉升（純邏輯，不依賴 cc）。
 *
 * - 將階 0~5，名聲達門檻自動升階；將階只升不降。
 * - 帶兵基礎值沿用 SortieDeploy.COMMAND_CAPACITY_RANK_BASE（4,000～20,000）。
 * - 門檻、名聲來源數字為 2026-11-06 使用者裁決的暫定值。
 *
 * Unity 對照：像一張 ScriptableObject 等級表＋一個 AddExp() 純函式，回傳升了哪幾級。
 */

/** 各將階需要的累積名聲（索引＝將階） */
export const GENERAL_RANK_FAME_THRESHOLDS: readonly number[] = [0, 100, 300, 600, 1000, 1500];

/** 將階稱號（戰報與提示用） */
export const GENERAL_RANK_TITLES: readonly string[] = ['牙門草莽', '裨將校尉', '偏將軍', '雜號將軍', '四征四鎮將軍', '上將軍'];

export const GENERAL_RANK_MAX = GENERAL_RANK_FAME_THRESHOLDS.length - 1;

/** 名聲來源（暫定，11/06 裁決）；斬將、討伐、單挑、宿命戰待戰場回報對應資料後接上 */
export const GENERAL_FAME_AWARD = {
    battleWin: 15,
    battleLose: 5,
    enemyCommanderSlain: 20,
    bossOrInvasionWin: 40,
    duelWin: 15,
    hallMissionNormal: 10,
    hallMissionElite: 15,
    hallMissionHard: 25,
    destinyBattleWin: 50,
} as const;

/** 算「高難／地獄」的大廳任務難度（ELITE 另成一檔，11/06 裁決） */
const HARD_HALL_DIFFICULTIES: ReadonlySet<string> = new Set(['ADVANCED', 'HELL']);

export interface GeneralFameHolder {
    generalFame?: number;
    generalRank?: number;
}

export interface GeneralFameGainResult<T extends GeneralFameHolder> {
    general: T;
    /** 這次新升上的將階（由低到高）；沒升階為空陣列 */
    promotedRanks: number[];
}

function nonNegInt(value: number | undefined): number {
    return Number.isFinite(value) && (value as number) > 0 ? Math.floor(value as number) : 0;
}

/** 名聲對應的將階 */
export function generalRankForFame(fame: number): number {
    const value = nonNegInt(fame);
    let rank = 0;
    for (let i = 1; i <= GENERAL_RANK_MAX; i++) {
        if (value >= GENERAL_RANK_FAME_THRESHOLDS[i]) rank = i;
    }
    return rank;
}

/** 下一階需要的名聲；已達最高階回傳 null */
export function nextGeneralRankFame(rank: number): number | null {
    const next = Math.min(GENERAL_RANK_MAX, nonNegInt(rank)) + 1;
    return next > GENERAL_RANK_MAX ? null : GENERAL_RANK_FAME_THRESHOLDS[next];
}

export function generalRankTitle(rank: number): string {
    return GENERAL_RANK_TITLES[Math.min(GENERAL_RANK_MAX, nonNegInt(rank))];
}

/** 入帳名聲並依門檻升階；將階只升不降，gain ≤ 0 時原樣回傳 */
export function gainGeneralFame<T extends GeneralFameHolder>(general: T, gain: number): GeneralFameGainResult<T> {
    const amount = nonNegInt(gain);
    if (amount === 0) return { general, promotedRanks: [] };
    const fame = nonNegInt(general.generalFame) + amount;
    const before = Math.min(GENERAL_RANK_MAX, nonNegInt(general.generalRank));
    const after = Math.max(before, generalRankForFame(fame));
    const promotedRanks: number[] = [];
    for (let rank = before + 1; rank <= after; rank++) promotedRanks.push(rank);
    return { general: { ...general, generalFame: fame, generalRank: after }, promotedRanks };
}

/** 正式出征結算的名聲：勝 15、敗 5；平手或未結束為 0 */
export function battleFameGain(result: string): number {
    if (result === 'player-win') return GENERAL_FAME_AWARD.battleWin;
    if (result === 'enemy-win') return GENERAL_FAME_AWARD.battleLose;
    return 0;
}

/** 大廳軍事任務的名聲：只有完成才給，高難／地獄 25、菁英 15、其餘 10 */
export function hallMissionFameGain(outcome: { difficulty: string; success: boolean }): number {
    if (!outcome.success) return 0;
    if (HARD_HALL_DIFFICULTIES.has(outcome.difficulty)) return GENERAL_FAME_AWARD.hallMissionHard;
    return outcome.difficulty === 'ELITE' ? GENERAL_FAME_AWARD.hallMissionElite : GENERAL_FAME_AWARD.hallMissionNormal;
}
