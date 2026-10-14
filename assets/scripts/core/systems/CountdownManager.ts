// @spec-source → WBS v5 OPEN-11（CountdownManager 趕路倒數）；開場程式規格書 §3.6 CountdownConfig、新手開場規格書 §10.4（暫定）
/**
 * CountdownManager — 趕路倒數的純邏輯，不依賴 cc。
 *
 * 倒數以絕對時間戳記（起點與終點，毫秒）記錄，不靠每秒累加，
 * 所以玩家離線期間的時間自動計入，回來時直接用現在的時間算剩餘。
 * 加速只改狀態，回傳需扣的 rushPrice，扣款由呼叫端處理。
 * Unity 對照：像 DateTime.UtcNow 算剩餘時間，而不是 Update() 每幀減 deltaTime；
 * 這樣 App 被關掉再開，倒數仍然準確。
 */

export interface CountdownState {
    targetId: string;
    startTimestamp: number;
    finishTimestamp: number;
    canAccelerate: boolean;
    /** 已被加速完成（不看時間，立即到達）。 */
    accelerated: boolean;
}

export type CountdownStatus = 'traveling' | 'arrived';

export interface CountdownSnapshot {
    status: CountdownStatus;
    remainingMs: number;
}

export type CountdownRejectReason = 'cannot-accelerate' | 'already-arrived';

export interface CountdownRushResult {
    ok: boolean;
    reason?: CountdownRejectReason;
    state: CountdownState;
}

/** 建立倒數。durationMs 必須是有限正數，否則拋出 RangeError。 */
export function createCountdown(
    targetId: string,
    startTimestamp: number,
    durationMs: number,
    canAccelerate: boolean,
): CountdownState {
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
        throw new RangeError(`趕路時長必須為正數，收到 ${durationMs}`);
    }
    return {
        targetId,
        startTimestamp,
        finishTimestamp: startTimestamp + durationMs,
        canAccelerate,
        accelerated: false,
    };
}

/** 依目前時間算剩餘與狀態。加速過或已到終點即為已到達，剩餘為 0。 */
export function countdownStatus(state: Readonly<CountdownState>, now: number): CountdownSnapshot {
    if (state.accelerated || now >= state.finishTimestamp) {
        return { status: 'arrived', remainingMs: 0 };
    }
    return { status: 'traveling', remainingMs: state.finishTimestamp - now };
}

/**
 * 加速完成。只有 canAccelerate 為 true 且仍在趕路中才會成功。
 * 回傳的新狀態標為 accelerated；扣款金額由呼叫端自行讀取 rushPrice。
 */
export function rushCountdown(state: Readonly<CountdownState>, now: number): CountdownRushResult {
    if (countdownStatus(state, now).status === 'arrived') {
        return { ok: false, reason: 'already-arrived', state: { ...state } };
    }
    if (!state.canAccelerate) {
        return { ok: false, reason: 'cannot-accelerate', state: { ...state } };
    }
    return { ok: true, state: { ...state, accelerated: true } };
}

/** 主畫面常駐圖示：只有趕路中才顯示。 */
export function shouldShowResidentIcon(state: Readonly<CountdownState>, now: number): boolean {
    return countdownStatus(state, now).status === 'traveling';
}
