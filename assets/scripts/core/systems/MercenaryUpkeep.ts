// @spec-source → 傭兵系統規格書：試用轉永久 §3.1（每日薪水與美酒）、§4（欠薪與救援、凍結）、§5（凍結期間不可出戰、不可教官）；WBS v3 MERC 段（薪水與欠薪凍結，依 PM 裁定以遊戲日計算）
/**
 * MercenaryUpkeep — 傭兵每日薪水（黃金＋美酒）與欠薪凍結純邏輯，不依賴 cc。
 *
 * 時間單位採遊戲日：規格的「24 小時」對應 1 個遊戲日（PM 裁定）。
 * 每日結算（rollover）時呼叫 settleUpkeepDay；玩家補繳時呼叫 repayUpkeep。
 *
 * 規則：
 *   - Active：每日付薪水與美酒；付不起則凍結，凍結倒數 1 日。
 *   - Frozen：不可出戰、不可教官；每日倒數減 1。倒數歸零仍未補繳即離隊（Departed）。
 *   - repayUpkeep：補足所有欠款（每欠一日付一份日成本）即回到 Active。
 *
 * 規格沒寫倒數歸零的結果，離隊為本模組的判斷；離隊後的告別信與冷卻由 MercenaryDeparture.settleUpkeepDeparture 接線。
 * 薪水金額由呼叫端傳入，規格的「隨武將強度掛鉤」公式尚未定義。尚未接存檔。
 *
 * Unity 對照：像 Subscription 的狀態機，每天 Tick 一次，欠費時進入 Grace 倒數。
 */

export const FREEZE_GRACE_DAYS = 1;

export interface UpkeepCost {
    gold: number;
    wine: number;
}

export interface UpkeepWallet {
    gold: number;
    wine: number;
}

export type UpkeepStatus = 'Active' | 'Frozen' | 'Departed';

export interface UpkeepState {
    uid: string;
    status: UpkeepStatus;
    /** 欠款日數（凍結期間每日累加）。 */
    unpaidDays: number;
    /** 凍結剩餘倒數（遊戲日）；非凍結時為 0。 */
    frozenDaysLeft: number;
}

export type UpkeepEvent =
    | { type: 'frozen'; uid: string; frozenDaysLeft: number }
    | { type: 'unfrozen'; uid: string }
    | { type: 'departed'; uid: string; reason: 'upkeep-unpaid' };

export interface UpkeepResult {
    state: UpkeepState;
    wallet: UpkeepWallet;
    events: UpkeepEvent[];
}

function assertCost(cost: UpkeepCost): void {
    if (!Number.isFinite(cost.gold) || cost.gold < 0 || !Number.isFinite(cost.wine) || cost.wine < 0) {
        throw new RangeError('每日成本必須為有限非負數');
    }
}

function canAfford(wallet: UpkeepWallet, amount: UpkeepCost): boolean {
    return wallet.gold >= amount.gold && wallet.wine >= amount.wine;
}

export function createUpkeepState(uid: string): UpkeepState {
    return { uid, status: 'Active', unpaidDays: 0, frozenDaysLeft: 0 };
}

/** 凍結中不可出戰；離隊者也不可。 */
export function canDeployMercenary(state: UpkeepState): boolean {
    return state.status === 'Active';
}

/** 凍結中不可教官工作（規格 §4）。 */
export function canTeachMercenary(state: UpkeepState): boolean {
    return state.status === 'Active';
}

/**
 * 每日結算。Active 時付當日成本，付不起則凍結；Frozen 時倒數減 1，歸零即離隊。
 * 回傳新狀態與新錢包，不改輸入、不用亂數、不寫存檔。
 */
export function settleUpkeepDay(source: UpkeepState, wallet: UpkeepWallet, cost: UpkeepCost): UpkeepResult {
    assertCost(cost);
    const state = { ...source };
    const result: UpkeepResult = { state, wallet: { ...wallet }, events: [] };
    if (source.status === 'Departed') return result;

    if (source.status === 'Active') {
        if (canAfford(wallet, cost)) {
            result.wallet = { gold: wallet.gold - cost.gold, wine: wallet.wine - cost.wine };
            return result;
        }
        state.status = 'Frozen';
        state.unpaidDays = source.unpaidDays + 1;
        state.frozenDaysLeft = FREEZE_GRACE_DAYS;
        result.events.push({ type: 'frozen', uid: source.uid, frozenDaysLeft: FREEZE_GRACE_DAYS });
        return result;
    }

    // Frozen：倒數一日，欠款加一日
    state.unpaidDays = source.unpaidDays + 1;
    state.frozenDaysLeft = source.frozenDaysLeft - 1;
    if (state.frozenDaysLeft <= 0) {
        state.status = 'Departed';
        state.frozenDaysLeft = 0;
        result.events.push({ type: 'departed', uid: source.uid, reason: 'upkeep-unpaid' });
    }
    return result;
}

/**
 * 補繳欠款：每欠一日付一份日成本。錢包足夠才會回到 Active；不足則不變。
 * 只在 Frozen 時有效；Active 與 Departed 直接回傳原狀態。
 */
export function repayUpkeep(source: UpkeepState, wallet: UpkeepWallet, cost: UpkeepCost): UpkeepResult {
    assertCost(cost);
    const result: UpkeepResult = { state: { ...source }, wallet: { ...wallet }, events: [] };
    if (source.status !== 'Frozen') return result;
    const owed = { gold: cost.gold * source.unpaidDays, wine: cost.wine * source.unpaidDays };
    if (!canAfford(wallet, owed)) return result;
    result.wallet = { gold: wallet.gold - owed.gold, wine: wallet.wine - owed.wine };
    result.state = { uid: source.uid, status: 'Active', unpaidDays: 0, frozenDaysLeft: 0 };
    result.events.push({ type: 'unfrozen', uid: source.uid });
    return result;
}
