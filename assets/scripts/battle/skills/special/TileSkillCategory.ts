// @spec-source → WBS SCN-09；PROG-2-1972 #14 暫定裁決；PROG-2-1983
/**
 * TileSkillCategory — 格子戰法三大類（突擊／控制／環境）
 *
 * 規格只給三類名稱，沒有逐招歸類。暫定：用既有顯示標籤 categoryTag 對照歸類，
 * 未列的標籤一律算突擊。對照表待使用者確認。
 */

export type TileSkillCategory = 'assault' | 'control' | 'environment';

/** 暫定對照：categoryTag → 三大類 */
export const TILE_SKILL_CATEGORY_BY_TAG: Readonly<Record<string, TileSkillCategory>> = {
    突擊: 'assault', 斬擊: 'assault', 爆發: 'assault', 破陣: 'assault', 範圍: 'assault', 文擊: 'assault',
    控制: 'control', 魅惑: 'control', 壓制: 'control', 奇策: 'control', 離間: 'control',
    火攻: 'environment', 陣列: 'environment', 支援: 'environment', 戰術: 'environment',
};

export function tileSkillCategoryOf(categoryTag: string): TileSkillCategory {
    return TILE_SKILL_CATEGORY_BY_TAG[categoryTag] ?? 'assault';
}
