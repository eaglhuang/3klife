// @spec-source → 可結緣女性來源系統.md §A 第 5 項（子嗣女兒分流）、§G（及笄劇本）、§H（UI_DAUGHTER_COMING）；FEM-06（PROG-2-0566）
/**
 * DaughterComingOfAge — 子嗣女兒 14 歲及笄分流（純邏輯，不依賴 cc）
 *
 * 女兒滿 14 歲時，玩家選擇職能路線：前線武將 / 後宮女官 / 教官儲備。
 * 前線武將與教官儲備直接對應規格職能（Combat / Mentor）；後宮女官的加成方向規格尚未裁決，
 * 因此只記錄路線、職能維持 null，回報為待裁決，不硬歸類。
 *
 * Unity 對照：像 Dropdown 的選項表，選完寫進資料，選過之後 Interactable 關掉、不能再改。
 */
import type { CanonicalRole } from '../models/GeneralRole';
import { lockRole } from '../models/GeneralRole';

export const DAUGHTER_COMING_OF_AGE = 14;

export type DaughterRoute = 'frontline' | 'palace' | 'instructor';

/** 路線對應的規格職能；後宮女官為待裁決，回傳 null */
export const DAUGHTER_ROUTE_ROLE: Readonly<Record<DaughterRoute, CanonicalRole | null>> = {
    frontline: 'Combat',
    palace: null,
    instructor: 'Mentor',
};

export interface DaughterRecord {
    id: string;
    age: number;
    role: CanonicalRole | null;
    route?: DaughterRoute | null;
}

export type AssignDaughterResult =
    | { ok: true; daughter: DaughterRecord; pendingDecision: boolean }
    | { ok: false; reason: 'NOT_OF_AGE' | 'ALREADY_ROUTED' };

export function isComingOfAge(age: number): boolean {
    return Number.isFinite(age) && age >= DAUGHTER_COMING_OF_AGE;
}

/** 分流：未滿 14 歲或已分流者拒絕；成功後路線寫入，職能依 lockRole 只設一次 */
export function assignDaughterRoute(daughter: DaughterRecord, route: DaughterRoute): AssignDaughterResult {
    if (!isComingOfAge(daughter.age)) return { ok: false, reason: 'NOT_OF_AGE' };
    if (daughter.route) return { ok: false, reason: 'ALREADY_ROUTED' };

    const mapped = DAUGHTER_ROUTE_ROLE[route];
    const role = mapped ? lockRole(daughter.role, mapped) : daughter.role;
    return {
        ok: true,
        daughter: { ...daughter, route, role },
        pendingDecision: mapped === null,
    };
}

/** 已滿 14 歲、尚未選路線的女兒，給 UI 排提示用 */
export function daughtersAwaitingRoute(daughters: readonly DaughterRecord[]): DaughterRecord[] {
    return daughters.filter((d) => isComingOfAge(d.age) && !d.route);
}

/**
 * 年度推進：每年女兒長一歲；回傳新清單與「本年剛滿 14 歲」的女兒（只回傳跨過門檻的那一年）。
 * 暫定（可逆）：一年一歲，與年報的年度節奏一致。
 */
export function advanceDaughtersOneYear(list: readonly DaughterRecord[]): { daughters: DaughterRecord[]; newlyOfAge: DaughterRecord[] } {
    const newlyOfAge: DaughterRecord[] = [];
    const daughters = list.map((d) => {
        const next = { ...d, age: d.age + 1 };
        if (!isComingOfAge(d.age) && isComingOfAge(next.age)) newlyOfAge.push(next);
        return next;
    });
    return { daughters, newlyOfAge };
}
