// @spec-source → 可結緣女性來源系統.md §5（子嗣女兒分流 P0）、§事件文案「及笄」；PROG-2-0514（FEM-06）
/**
 * DaughterComingOfAge — 子嗣女兒 14 歲及笄分流（純邏輯，不依賴 cc）
 *
 * 規格：女兒 14 歲成年時，玩家選擇職能路線：前線武將 / 後宮女官 / 教官儲備。
 * 本模組只做「何時觸發」與「選了哪條路」的資料判定，不附加路線效果（規格未定）。
 *
 * Unity 對照：像一個 Animation Event 的判定器：年齡跨過 14 時發出一次事件，
 * 玩家選擇後把結果寫回欄位；判定函式本身不改任何資料。
 */

export const COMING_OF_AGE_AGE = 14;

export const DAUGHTER_ROUTES = ['frontline', 'palace', 'mentor_reserve'] as const;
export type DaughterRoute = (typeof DAUGHTER_ROUTES)[number];

export interface DaughterCandidate {
    gender?: string | null;
    daughterRoute?: DaughterRoute | null;
}

export type DaughterRouteResult<T> =
    | { ok: true; general: T & { daughterRoute: DaughterRoute } }
    | { ok: false; reason: 'not-female' | 'not-of-age' | 'already-chosen' | 'invalid-route' };

function isFemale(general: DaughterCandidate): boolean {
    return general.gender === '女';
}

/**
 * 年齡從 previousAge 推進到 nextAge 時，是否剛好跨過 14 歲（含跨過）。
 * 只有女性、且尚未選過路線時回報；不改輸入。
 */
export function isComingOfAge(general: DaughterCandidate, previousAge: number, nextAge: number): boolean {
    if (!isFemale(general)) return false;
    if (general.daughterRoute) return false;
    if (!Number.isFinite(previousAge) || !Number.isFinite(nextAge)) return false;
    return previousAge < COMING_OF_AGE_AGE && nextAge >= COMING_OF_AGE_AGE;
}

/**
 * 玩家為及笄的女兒選定路線。回傳新物件，寫入 daughterRoute；不改輸入。
 * 條件：女性、年齡 ≥ 14、尚未選過、路線在白名單內。
 */
export function chooseDaughterRoute<T extends DaughterCandidate & { age?: number }>(
    general: T,
    route: string,
): DaughterRouteResult<T> {
    if (!isFemale(general)) return { ok: false, reason: 'not-female' };
    if ((general.age ?? 0) < COMING_OF_AGE_AGE) return { ok: false, reason: 'not-of-age' };
    if (general.daughterRoute) return { ok: false, reason: 'already-chosen' };
    if (!(DAUGHTER_ROUTES as readonly string[]).includes(route)) return { ok: false, reason: 'invalid-route' };
    return { ok: true, general: { ...general, daughterRoute: route as DaughterRoute } };
}
