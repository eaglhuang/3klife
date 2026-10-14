// @spec-source → 武將系統.md §Server 端欄位表（Role ENUM）（GEN-06 接線，PROG-2-0556）
/**
 * RosterRoleLoad — 讀檔時把名冊的舊職能值正規化（純邏輯，不依賴 cc）
 *
 * 只改寫能對應到 Combat / Mentor 的值；對不上的值（待裁決）原樣保留，
 * 交給 reportRoles 列出，不在讀檔時默默改成別的職能。
 *
 * Unity 對照：像 OnDeserialize 回呼，讀進來時把舊欄位轉成新 enum，不回寫到存檔檔案。
 */
import { toCanonicalRole } from '../models/GeneralRole';

export function normalizeRosterRoles<T extends { id: string; role?: unknown }>(generals: readonly T[]): T[] {
    return generals.map((general) => {
        const canonical = toCanonicalRole(general.role);
        return canonical === null ? general : { ...general, role: canonical };
    });
}
