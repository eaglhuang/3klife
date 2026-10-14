// @spec-source → 武將系統.md §Server 端欄位表（Role ENUM）、名詞定義文件.md（教官 = Mentor / Support）（GEN-06，PROG-2-0552）
/**
 * GeneralRole — 職能雙軌分流（純邏輯，不依賴 cc）
 *
 * 規格：Role 只有 Combat（戰鬥武將）與 Mentor（專業教官），加入時決定，不可更改。
 * 資料的 role 欄位有 8 種舊值，這裡統一成兩種；規格沒定義的值回報為待裁決，不硬歸類。
 *
 * Unity 對照：像 enum 的 Converter，舊的字串對應到新的 enum；對不上的值進 Log，不默默吞掉。
 */

export type CanonicalRole = 'Combat' | 'Mentor';

/**
 * 舊資料值 → 規格職能；沒列在這裡的值為待裁決。
 * PM 裁定（暫定）：軍師（Advisor）、名士（Noble）、策士（Planner）一律歸 Combat，教官只由 Support 與退役轉化而來。
 */
const ROLE_MAP: Readonly<Record<string, CanonicalRole>> = {
    Combat: 'Combat',
    Commander: 'Combat',
    Warrior: 'Combat',
    Hybrid: 'Combat',
    Advisor: 'Combat',
    Planner: 'Combat',
    Noble: 'Combat',
    Mentor: 'Mentor',
    Support: 'Mentor',
};

/** 把舊資料值轉成規格職能；不認識的值回傳 null */
export function toCanonicalRole(raw: unknown): CanonicalRole | null {
    if (typeof raw !== 'string') return null;
    return ROLE_MAP[raw] ?? null;
}

/**
 * 角色的不可變更規則：一旦定下（非 null）就保留原值，新值不覆蓋。
 * 規格：加入時決定，不可更改。
 */
export function lockRole(current: CanonicalRole | null, requested: CanonicalRole): CanonicalRole {
    return current ?? requested;
}

/** 整批統計：已歸類的數量，與未歸類（待裁決）的武將清單 */
export function reportRoles(generals: ReadonlyArray<{ id: string; role?: unknown }>): {
    mapped: number;
    unmapped: Array<{ id: string; raw: string }>;
} {
    let mapped = 0;
    const unmapped: Array<{ id: string; raw: string }> = [];
    for (const general of generals) {
        if (toCanonicalRole(general.role) !== null) {
            mapped++;
        } else {
            unmapped.push({ id: general.id, raw: String(general.role ?? '') });
        }
    }
    return { mapped, unmapped };
}
