// @spec-source → 傭兵系統規格書（8 小時刷新）、養成系統與教官來源定義（地下城救美）、FEM-08 送禮好感；FEM 接線（PROG-2-0564）
/**
 * FemaleSystemState — 女性來源系統的存檔狀態（純邏輯，不依賴 cc）
 *
 * 存的是三樣東西：傭兵池上次刷新時間、救美上次刷新時間、各女武將的送禮好感（0~100）。
 * 舊檔沒有這個欄位時讀回預設值（時間 0、好感空表）。
 *
 * Unity 對照：像一個 ScriptableObject 的序列化欄位，缺的欄位給預設值，超出範圍的數字夾回。
 */
import { applyGiftAffection, GIFT_AFFECTION_MAX, GIFT_AFFECTION_MIN } from './GiftAffection';

/** 上次刷新時間（毫秒）；null 表示從未刷新，第一次一定會刷新 */
export interface FemaleSystemState {
    poolRefreshedAtMs: number | null;
    rescueRefreshedAtMs: number | null;
    giftAffection: Record<string, number>;
}

export const EMPTY_FEMALE_SYSTEM_STATE: Readonly<FemaleSystemState> = Object.freeze({
    poolRefreshedAtMs: null,
    rescueRefreshedAtMs: null,
    giftAffection: Object.freeze({}) as Record<string, number>,
});

function timestampOrNull(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** 讀檔正規化：缺欄位給預設值，好感夾在 0~100，非數字的好感丟棄 */
export function normalizeFemaleSystemState(raw: unknown): FemaleSystemState {
    const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof FemaleSystemState, unknown>>;
    const affectionSource = (source.giftAffection && typeof source.giftAffection === 'object' ? source.giftAffection : {}) as Record<string, unknown>;
    const giftAffection: Record<string, number> = {};
    for (const [uid, value] of Object.entries(affectionSource)) {
        if (typeof value !== 'number' || !Number.isFinite(value)) continue;
        giftAffection[uid] = Math.min(GIFT_AFFECTION_MAX, Math.max(GIFT_AFFECTION_MIN, value));
    }
    return {
        poolRefreshedAtMs: timestampOrNull(source.poolRefreshedAtMs),
        rescueRefreshedAtMs: timestampOrNull(source.rescueRefreshedAtMs),
        giftAffection,
    };
}

/** 送禮：回傳新的狀態（不改傳入物件） */
export function giftToFemale(state: FemaleSystemState, uid: string, giftValue: number): FemaleSystemState {
    const current = state.giftAffection[uid] ?? 0;
    return {
        ...state,
        giftAffection: { ...state.giftAffection, [uid]: applyGiftAffection(current, giftValue) },
    };
}
