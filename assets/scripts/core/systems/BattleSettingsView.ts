// @spec-source → 主戰場UI規格書.md (doc_ui_0001) §戰報控制列 ⚙ 按鈕；面板內容由使用者 2026-11-06 授權自行設計（PROG-2-1890）
/**
 * BattleSettingsView — 戰場設定面板的顯示文字、音訊偏好與撤退確認（純邏輯，不依賴 cc）
 *
 * 面板內容：音樂開關、音效開關、撤退（同次開啟內再按一次才生效）、繼續戰鬥。
 *
 * Unity 對照：像 OptionsMenu 的 ViewModel，只算字串與狀態，由 View 套到 Label 與 Button 上。
 */

/** 音訊偏好（存在 localStorage，跨場景沿用） */
export interface AudioPrefs {
    bgmMuted: boolean;
    sfxMuted: boolean;
}

export const AUDIO_PREFS_KEY = '3klife.audioPrefs';
export const DEFAULT_AUDIO_PREFS: Readonly<AudioPrefs> = { bgmMuted: false, sfxMuted: false };

/** 讀取存檔字串；格式不對或欄位缺漏時回到預設值（全部開啟） */
export function parseAudioPrefs(raw: string | null | undefined): AudioPrefs {
    if (!raw) return { ...DEFAULT_AUDIO_PREFS };
    try {
        const data = JSON.parse(raw) as Partial<AudioPrefs>;
        return { bgmMuted: data?.bgmMuted === true, sfxMuted: data?.sfxMuted === true };
    } catch {
        return { ...DEFAULT_AUDIO_PREFS };
    }
}

/** 開關按鈕文字，例如「音樂：開」 */
export function audioToggleText(kind: 'bgm' | 'sfx', muted: boolean): string {
    return `${kind === 'bgm' ? '音樂' : '音效'}：${muted ? '關' : '開'}`;
}

/**
 * 撤退按鈕點擊：第一次只待確認，第二次明確確認才生效。
 * 待確認狀態由設定面板關閉／重開時取消，不使用隱藏時間窗。
 * Web 載入／卡頓可能超過三秒；只要文字仍顯示「再按一次」就必須可以確認。
 */
export function retreatClick(armedAt: number | null, now: number): { confirmed: boolean; armedAt: number | null } {
    if (armedAt !== null) return { confirmed: true, armedAt: null };
    return { confirmed: false, armedAt: now };
}

export function retreatButtonText(armed: boolean): string {
    return armed ? '確定撤退？再按一次' : '撤退（判定戰敗）';
}
