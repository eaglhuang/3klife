// @spec-source → 共用框架總綱規格書 (doc_spec_1182) 第 11.2 節 候選 C 時間週期（Clock／Schedule）、第 12.2 節 FND-M「時鐘（季、遞減）」；PROG-2-9202
/**
 * GameClock — 以「季」為單位的時間算術與遞減計數（零依賴純函式庫）。
 *
 * 與 GameTimeState 對齊：年（currentYear）＋季（1～4）。季序 = 年 * 4 + (季 - 1)，
 * 所有比較、差值、定期發放都用季序整數，不用日期物件，避免時區與浮點問題。
 *
 * 這裡只做「算術」；真正推進時間的是 API 的 `time.advanceSeason`（伺服器權威）。
 * 用途：入學令季發、凍結期遞減、狀態效果持續季數、限時過期。
 * 日／週重置排程與季結算管線屬後續框架（總綱 Q-C），不在本檔。
 */

/** 一個時間點：年＋季（1～4） */
export interface SeasonStamp {
    year: number;
    /** 1～4 */
    season: number;
}

export const SEASONS_PER_YEAR = 4;

function assertStamp(stamp: SeasonStamp): void {
    if (!Number.isInteger(stamp.year) || !Number.isInteger(stamp.season) || stamp.season < 1 || stamp.season > SEASONS_PER_YEAR) {
        throw new Error(`GameClock: 無效的時間點 ${JSON.stringify(stamp)}`);
    }
}

/** 年季 → 季序（單調遞增整數） */
export function toSeasonIndex(stamp: SeasonStamp): number {
    assertStamp(stamp);
    return stamp.year * SEASONS_PER_YEAR + (stamp.season - 1);
}

/** 季序 → 年季 */
export function fromSeasonIndex(index: number): SeasonStamp {
    if (!Number.isInteger(index)) throw new Error(`GameClock: 季序必須是整數，收到 ${index}`);
    const year = Math.floor(index / SEASONS_PER_YEAR);
    return { year, season: index - year * SEASONS_PER_YEAR + 1 };
}

/** 往後（或往前，負數）推 n 季 */
export function addSeasons(stamp: SeasonStamp, n: number): SeasonStamp {
    return fromSeasonIndex(toSeasonIndex(stamp) + n);
}

/** from 到 to 相隔幾季（to 較晚為正） */
export function seasonsBetween(from: SeasonStamp, to: SeasonStamp): number {
    return toSeasonIndex(to) - toSeasonIndex(from);
}

/** 遞減計數器（凍結期、狀態效果、限時過期共用）；remaining ≤ 0 即到期 */
export interface Countdown {
    remaining: number;
}

export function createCountdown(seasons: number): Countdown {
    if (!Number.isInteger(seasons) || seasons < 0) throw new Error(`GameClock: 持續季數必須是非負整數，收到 ${seasons}`);
    return { remaining: seasons };
}

/** 遞減 n 季（預設 1），不會低於 0；回傳新物件，不改原物件 */
export function tickCountdown(countdown: Countdown, n = 1): Countdown {
    if (!Number.isInteger(n) || n < 0) throw new Error(`GameClock: 遞減季數必須是非負整數，收到 ${n}`);
    return { remaining: Math.max(0, countdown.remaining - n) };
}

export function isCountdownExpired(countdown: Countdown): boolean {
    return countdown.remaining <= 0;
}

/**
 * 定期發放：從上次發放季序到現在，每滿 everySeasons 季算一期，回傳應補發幾期。
 * - lastIndex 為 null（從未發放）→ 回傳 1（第一期立即可領）。
 * - 離線／跳季一次補多期；是否封頂由呼叫端（物品庫存的 stackCap）決定。
 * - 回傳的期數乘以 everySeasons 加到 lastIndex 即為新的「上次發放季序」（用 nextGrantIndex）。
 */
export function periodsDue(lastIndex: number | null, nowIndex: number, everySeasons: number): number {
    if (!Number.isInteger(everySeasons) || everySeasons <= 0) throw new Error(`GameClock: 週期必須是正整數，收到 ${everySeasons}`);
    if (lastIndex === null) return 1;
    const gap = nowIndex - lastIndex;
    return gap <= 0 ? 0 : Math.floor(gap / everySeasons);
}

/** 發放 periods 期後，新的「上次發放季序」（保留餘數，不吃掉未滿一期的季數） */
export function nextGrantIndex(lastIndex: number | null, nowIndex: number, everySeasons: number, periods: number): number {
    if (lastIndex === null) return nowIndex;
    return lastIndex + periods * everySeasons;
}
