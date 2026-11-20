// @spec-source → PROG-2-9196：背景建構途中切場景，host 讀到 null 不可跳錯誤浮層
/** 建構用掛載節點是否還活著：null／undefined／已銷毀（isValid === false）都視為已失效 */
export function isBuildHostAlive(host: { isValid?: boolean } | null | undefined): boolean {
    return Boolean(host) && host!.isValid !== false;
}
