// @spec-source → WBS v5 HALL-07（武將點位刷新池）；HallCharacterRoll 純邏輯的呼叫端（PROG-2-0451，暫定）
/**
 * HallCharacterPresenter — 大廳武將點位的刷新狀態與列資料，純 TS，不依賴 cc。
 *
 * refresh 函式每次都回傳新狀態，不改輸入；未到 60 秒就沿用舊點位，不重抽。
 * View 只把列資料套到頭像與文字，與 HallMissionBoardPresenter 相同做法。
 * Unity 對照：像一個 Coroutine 每 60 秒呼叫一次 RollSpots()，沒到時間就直接回傳快取的結果。
 */
import { HallCandidate, clampOccupantCount, clampSpotCount, isHallRefreshDue, rollHallCharacters } from './HallCharacterRoll';

export interface HallSpotState {
    /** 上次刷新時的秒數；從未刷新為 null。 */
    lastRefreshSec: number | null;
    /** 目前點位上的武將 id，依抽出順序。 */
    spotIds: string[];
}

export interface HallSpotRow {
    id: string;
    favorite: boolean;
    assigned: boolean;
}

export const EMPTY_HALL_SPOT_STATE: HallSpotState = Object.freeze({ lastRefreshSec: null, spotIds: [] });

/**
 * 依時間決定是否刷新點位。
 * 從未刷新或距上次已滿 60 秒才重抽，否則原樣回傳同一個狀態物件。
 * count 會先夾回 3~5 人的範圍；candidates 為空時點位清空。
 */
export function refreshHallCharacterSpots(
    state: Readonly<HallSpotState>,
    nowSec: number,
    candidates: readonly HallCandidate[],
    count: number,
    random: () => number,
): HallSpotState {
    const due = state.lastRefreshSec === null || isHallRefreshDue(state.lastRefreshSec, nowSec);
    if (!due) return state as HallSpotState;
    return {
        lastRefreshSec: nowSec,
        spotIds: rollHallCharacters(candidates, clampOccupantCount(count), random),
    };
}

/** 把點位上的 id 轉成列資料；找不到候選人的 id 會被略過。不改輸入。 */
export function buildHallSpotRows(spotIds: readonly string[], candidates: readonly HallCandidate[]): HallSpotRow[] {
    const byId = new Map(candidates.map(c => [c.id, c] as const));
    const rows: HallSpotRow[] = [];
    for (const id of spotIds) {
        const candidate = byId.get(id);
        if (!candidate) continue;
        rows.push({ id, favorite: candidate.favorite, assigned: candidate.assigned });
    }
    return rows;
}

/** 點位數夾回 6~8，給 View 決定要畫幾個位置。 */
export function hallSpotSlotCount(requested: number): number {
    return clampSpotCount(requested);
}
