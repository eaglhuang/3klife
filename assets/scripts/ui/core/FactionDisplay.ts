// @spec-source → 武將列表陣營欄（PROG-2-1642）
/**
 * 陣營代碼 → 顯示名稱。純資料，不依賴 cc；未知代碼原樣回傳，空值回傳破折號。
 */
export const FACTION_DISPLAY_NAMES: Readonly<Record<string, string>> = {
    shu: '蜀',
    wei: '魏',
    wu: '吳',
    neutral: '群',
    other: '群',
    player: '我軍',
    enemy: '敵軍',
};

export function factionDisplayName(faction: string | null | undefined): string {
    if (!faction) return '—';
    return FACTION_DISPLAY_NAMES[faction] ?? faction;
}
