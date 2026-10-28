/**
 * UltimateUsage — 奧義選單「本場已用」標記（E-9 每場每個奧義限用 1 次，PROG-2-1512）
 * 純函式、不依賴 cc，供選單與測試共用。
 */

/** 依本場已施放的 skillId 標記選單項目 */
export function markUsedUltimates<T extends { skillId: string }>(skills: readonly T[], usedSkillIds: ReadonlySet<string>): Array<T & { used: boolean }> {
    return skills.map((skill) => ({ ...skill, used: usedSkillIds.has(skill.skillId) }));
}
