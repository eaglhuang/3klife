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
import type { DaughterRecord, DaughterRoute } from './DaughterComingOfAge';

/** 上次刷新時間（毫秒）；null 表示從未刷新，第一次一定會刷新 */
export interface FemaleSystemState {
    poolRefreshedAtMs: number | null;
    rescueRefreshedAtMs: number | null;
    giftAffection: Record<string, number>;
    /** 子嗣女兒清單（FEM-06）；後加的選填欄位，舊檔讀回為空清單 */
    daughters: DaughterRecord[];
}

export const EMPTY_FEMALE_SYSTEM_STATE: Readonly<FemaleSystemState> = Object.freeze({
    poolRefreshedAtMs: null,
    rescueRefreshedAtMs: null,
    giftAffection: Object.freeze({}) as Record<string, number>,
    daughters: Object.freeze([] as DaughterRecord[]) as DaughterRecord[],
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
        daughters: normalizeDaughters(source.daughters),
    };
}

const DAUGHTER_ROUTES: readonly DaughterRoute[] = ['frontline', 'palace', 'instructor'];

/** 讀檔正規化：丟掉缺 id 或年齡不是數字的紀錄，重複 id 只留第一筆，路線不合法則視為未分流 */
function normalizeDaughters(raw: unknown): DaughterRecord[] {
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const out: DaughterRecord[] = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const d = item as Partial<Record<keyof DaughterRecord, unknown>>;
        if (typeof d.id !== 'string' || d.id.length === 0 || seen.has(d.id)) continue;
        if (typeof d.age !== 'number' || !Number.isFinite(d.age)) continue;
        seen.add(d.id);
        const route = DAUGHTER_ROUTES.includes(d.route as DaughterRoute) ? (d.route as DaughterRoute) : null;
        out.push({
            id: d.id,
            age: Math.max(0, Math.floor(d.age)),
            role: typeof d.role === 'string' ? (d.role as DaughterRecord['role']) : null,
            route,
        });
    }
    return out;
}

/** 送禮：回傳新的狀態（不改傳入物件） */
export function giftToFemale(state: FemaleSystemState, uid: string, giftValue: number): FemaleSystemState {
    const current = state.giftAffection[uid] ?? 0;
    return {
        ...state,
        giftAffection: { ...state.giftAffection, [uid]: applyGiftAffection(current, giftValue) },
    };
}
