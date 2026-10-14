// @spec-source → 新手開場規格書 §5.4 紅顏趕路、§留存（趕路倒數）；PM 暫定：時長以回合數計（PROG-2-0474）
/**
 * TravelCountdown — 趕路倒數（回合制）的純邏輯，不依賴 cc。
 *
 * 與 CountdownManager（時間戳記制）不同：這裡只記剩餘回合數，每過一個回合才減一，
 * 離線與時鐘都不影響，所以存檔只需要存兩個欄位。
 * 規格的 arrivalTime 是回合數（SupportCardBase.arrivalTime），所以用這個模型。
 *
 * Unity 對照：像 Animator 的 int 參數，每回合 Decrement，歸零就觸發到達事件，不用 Update() 算時間。
 */

export interface TravelCountdown {
    targetId: string;
    /** 剩餘回合數（整數，0 = 已到達）。 */
    remainingTurns: number;
}

export type TravelStatus = 'traveling' | 'arrived';

export interface TravelSnapshot {
    status: TravelStatus;
    remainingTurns: number;
}

/** 建立趕路倒數。turns 必須是正整數，否則拋出 RangeError。 */
export function createTravelCountdown(targetId: string, turns: number): TravelCountdown {
    if (!Number.isInteger(turns) || turns < 1) {
        throw new RangeError(`趕路回合數必須為正整數，收到 ${turns}`);
    }
    return { targetId, remainingTurns: turns };
}

/** 推進一個回合：剩餘回合減一，最低為 0。不改輸入，回傳新狀態。 */
export function tickTravelCountdown(state: Readonly<TravelCountdown>): TravelCountdown {
    return { ...state, remainingTurns: Math.max(0, state.remainingTurns - 1) };
}

/** 接取天下沙盤遠征後的趕來回合數（暫定，規格未定數值）。 */
export const EXPEDITION_TRAVEL_TURNS = 3;

/** 讀回存檔用：只接受非空 targetId 與正整數剩餘回合；其餘（含 0 = 已到達）視為沒有趕路。 */
export function normalizeTravelCountdown(value: unknown): TravelCountdown | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const raw = value as Partial<TravelCountdown>;
    if (typeof raw.targetId !== 'string' || raw.targetId.length === 0) return null;
    if (typeof raw.remainingTurns !== 'number' || !Number.isInteger(raw.remainingTurns) || raw.remainingTurns < 1) return null;
    return { targetId: raw.targetId, remainingTurns: raw.remainingTurns };
}

/** 依剩餘回合判斷狀態；剩餘為 0 即已到達。 */
export function travelStatus(state: Readonly<TravelCountdown>): TravelSnapshot {
    if (state.remainingTurns <= 0) return { status: 'arrived', remainingTurns: 0 };
    return { status: 'traveling', remainingTurns: state.remainingTurns };
}
