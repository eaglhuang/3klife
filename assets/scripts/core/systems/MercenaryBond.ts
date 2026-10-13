// @spec-source → MVP遊戲驗證規格書 §E #11、§I Mercenary；傭兵系統規格書：試用轉永久 §3；WBS v3 MVP-09
/** 傭兵 6 日結義（試用→結義）的純邏輯；尚未接線到大廳、薪水或存檔。 */
export const TRIAL_DAYS = 6;
export type MercenaryStatus = 'Trial' | 'Bonded' | 'Expired';

export interface MercenaryState {
    uid: string;
    /** 試用剩餘天數，0~6。 */
    daysLeft: number;
    /** 已完成的試用天數（結義進度），0~6。 */
    bond: number;
    status: MercenaryStatus;
    /** 選填：對應 generals.json 的武將 id，結義入名冊時取用（舊存檔可能沒有）。 */
    generalId?: string;
    /** 選填：好感 0~60；結義點數即好感值（PM 暫定）。 */
    affection?: number;
}

export type MercenaryEvent =
    | { type: 'day-advanced'; uid: string; daysLeft: number; bond: number }
    | { type: 'trial-complete'; uid: string }
    | { type: 'bonded'; uid: string };

export type MercenaryRejectReason = 'not-trial' | 'trial-incomplete';

export interface MercenaryResult {
    state: MercenaryState;
    ok: boolean;
    reason?: MercenaryRejectReason;
    events: MercenaryEvent[];
}

/** 雇傭後的試用狀態：6 天倒數、結義進度 0。 */
export function createTrialMercenary(uid: string): MercenaryState {
    return { uid, daysLeft: TRIAL_DAYS, bond: 0, status: 'Trial' };
}

/** 可否結義：試用中且倒數歸零。 */
export function canBondMercenary(state: MercenaryState): boolean {
    return state.status === 'Trial' && state.daysLeft === 0;
}

/**
 * 推進一天：每日 bond +1、daysLeft −1；第 6 天結束時發 trial-complete。
 * 回傳新狀態與事件，不改輸入、不用亂數。非試用中或已倒數完畢時不變動。
 */
export function advanceMercenaryDay(source: MercenaryState): MercenaryResult {
    const state = { ...source };
    const result: MercenaryResult = { state, ok: false, events: [] };
    if (source.status !== 'Trial') {
        result.reason = 'not-trial';
        return result;
    }
    if (source.daysLeft <= 0) {
        result.reason = 'trial-incomplete';
        return result;
    }
    state.daysLeft = source.daysLeft - 1;
    state.bond = Math.min(TRIAL_DAYS, source.bond + 1);
    result.ok = true;
    result.events.push({ type: 'day-advanced', uid: source.uid, daysLeft: state.daysLeft, bond: state.bond });
    if (state.daysLeft === 0) result.events.push({ type: 'trial-complete', uid: source.uid });
    return result;
}

/** 結義：僅在倒數歸零的試用中可執行，成功後轉為 Bonded（永久武將）。 */
export function bondMercenary(source: MercenaryState): MercenaryResult {
    const state = { ...source };
    const result: MercenaryResult = { state, ok: false, events: [] };
    if (source.status !== 'Trial') {
        result.reason = 'not-trial';
        return result;
    }
    if (!canBondMercenary(source)) {
        result.reason = 'trial-incomplete';
        return result;
    }
    state.status = 'Bonded';
    result.ok = true;
    result.events.push({ type: 'bonded', uid: source.uid });
    return result;
}
