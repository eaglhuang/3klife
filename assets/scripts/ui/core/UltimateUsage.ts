/**
 * UltimateUsage — 奧義選單「本場已用」標記（E-9 每場每個奧義限用 1 次，PROG-2-1512）
 * 純函式、不依賴 cc，供選單與測試共用。
 */

/** 已用紀錄的 key：同一戰法可對應多個奧義，有 ultimateId 就用它區分（與戰場端 E-9 限用 key 一致） */
export function ultimateUsageKey(item: { skillId: string; ultimateId?: string | null }): string {
    return item.ultimateId ? item.ultimateId : item.skillId;
}

/** 依本場已施放的奧義 key（ultimateUsageKey）標記選單項目 */
export function markUsedUltimates<T extends { skillId: string; ultimateId?: string | null }>(skills: readonly T[], usedKeys: ReadonlySet<string>): Array<T & { used: boolean }> {
    return skills.map((skill) => ({ ...skill, used: usedKeys.has(ultimateUsageKey(skill)) }));
}
