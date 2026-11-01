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

/** 戰場覺醒定格演出時序（PROG-2-1702，秒；數值暫定） */
export const AWAKENING_FREEZE_TIMING = {
    fadeIn: 0.08,
    popScaleFrom: 1.6,
    pop: 0.25,
    hold: 1.2,
    fadeOut: 0.35,
} as const;

/** 定格畫面的大字：規格 §H「畫面定格→鎖頭碎裂→「{GeneName} 覺醒！」」 */
export function awakeningFreezeTitles(awakenings: readonly AwakeningLike[]): string[] {
    return awakenings.map(a => `🔓 ${a.displayName} 覺醒！`);
}
