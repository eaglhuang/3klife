/**
 * AwakeningReveal — 戰後覺醒在結算窗的揭示文字（PROG-2-1133）
 * 結算寫回名冊是非同步，覺醒結果晚於結算窗出現，故以追加行呈現「鎖頭碎裂」。
 */
export interface AwakeningLike {
    displayName: string;
}

export function formatAwakeningReveal(awakenings: readonly AwakeningLike[]): string[] {
    return awakenings.map(a => `🔓 鎖頭碎裂！【覺醒】${a.displayName}`);
}
