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

/**
 * 玩家名冊列表的陣營欄（PROG-2-10115）。
 * 資料裡 `faction: 'enemy'` 只是「模板預設站敵方」的戰場標記（例：呂布、貂蟬、公孫瓚），
 * 招募進玩家名冊後已經是自家人；名冊列表若仍寫「敵軍」會讓玩家以為混入敵將，改標「在野」。
 * 只用在名冊列表；戰場與敵方預覽仍走 factionDisplayName。
 */
export function rosterFactionDisplayName(faction: string | null | undefined): string {
    if (faction === 'enemy') return '在野';
    return factionDisplayName(faction);
}
