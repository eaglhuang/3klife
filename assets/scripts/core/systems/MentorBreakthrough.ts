// @spec-source → 教官系統（支援卡）.md (doc_spec_0027) §F-4 卡片星等突破系統、§M-1 突破規則
/**
 * MentorBreakthrough — 教官卡星等突破與重複卡判定（純邏輯，不依賴 cc）
 *
 * 規格：重複獲得同名教官卡 = 突破一次，最高 ★5（累計 5 次）。星等決定友情倍率、訓練倍率與已解鎖的靈感事件組。
 * 滿 ★5 後再拿到重複卡，不再升星，改走溢出轉化（溢出獎勵由 MENT-07 處理，這裡只回傳「溢出」結果）。
 *
 * 暫定：
 *   - 已解鎖事件組數 = min(星等 + 1, 6)，對應 §F-4「★N 解鎖事件組 1–(N+1)」，★5 為全部 6 組。
 *   - 「其他加成」欄（初期情誼 +5、訓練機率 +3% 等）只保留文字說明，尚未接效果。
 *
 * Unity 對照：像一張 ScriptableObject 星等表加一個 static 判定器，吃目前星等與「又抽到同名卡」事件，回傳結果；不直接改教官資料。
 */

export const MENTOR_MAX_STAR = 5;
export const MENTOR_EVENT_GROUP_COUNT = 6;

export interface MentorStarEntry {
    star: number;
    /** 友情加成倍率 */
    friendshipMultiplier: number;
    /** 訓練效果倍率 */
    trainingMultiplier: number;
    /** 已解鎖的靈感事件組數（1 = 只有事件組 1） */
    unlockedEventGroups: number;
    /** 其他加成（文字，尚未接效果） */
    otherBonus: string;
}

/** 星等表，索引即星等 ★0~★5 */
export const MENTOR_STAR_TABLE: readonly MentorStarEntry[] = [
    { star: 0, friendshipMultiplier: 1.0, trainingMultiplier: 1.0, unlockedEventGroups: 1, otherBonus: '屬性加成基礎值' },
    { star: 1, friendshipMultiplier: 1.1, trainingMultiplier: 1.05, unlockedEventGroups: 2, otherBonus: '初期情誼量 +5' },
    { star: 2, friendshipMultiplier: 1.2, trainingMultiplier: 1.1, unlockedEventGroups: 3, otherBonus: '訓練機率 +3%' },
    { star: 3, friendshipMultiplier: 1.3, trainingMultiplier: 1.15, unlockedEventGroups: 4, otherBonus: '屬性加成 ×1.1' },
    { star: 4, friendshipMultiplier: 1.4, trainingMultiplier: 1.2, unlockedEventGroups: 5, otherBonus: 'TP 加成 +10%' },
    { star: 5, friendshipMultiplier: 1.5, trainingMultiplier: 1.3, unlockedEventGroups: 6, otherBonus: '固有加成最高級' },
];

export type MentorDuplicateResult =
    | { kind: 'breakthrough'; star: number }
    | { kind: 'overflow'; star: number };

/** 星等夾到 0~5 的整數，非有限數視為 ★0 */
export function clampMentorStar(star: number | undefined): number {
    if (star === undefined || !Number.isFinite(star)) return 0;
    return Math.max(0, Math.min(MENTOR_MAX_STAR, Math.floor(star)));
}

export function mentorStarEntry(star: number | undefined): MentorStarEntry {
    return MENTOR_STAR_TABLE[clampMentorStar(star)];
}

/**
 * 爆發率隨星等成長（§F 爆發機率範圍，PROG-2-1163）：SSR ★0 40%~65%、★5 55%~80%，兩端差 15 個百分點。
 * 暫定：每升 1 星 +3 個百分點，R／SR 同樣套用；上限取規格最高值 80%，原本就高於上限的不往下砍。
 */
export const MENTOR_BURST_RATE_PER_STAR = 0.03;
export const MENTOR_BURST_RATE_CAP = 0.8;

export function burstRateAtStar(baseRate: number, star: number | undefined): number {
    const grown = Math.min(MENTOR_BURST_RATE_CAP, baseRate + MENTOR_BURST_RATE_PER_STAR * clampMentorStar(star));
    // 四捨五入到萬分位，避免 0.4 + 0.15 的浮點尾數
    return Math.round(Math.max(baseRate, grown) * 10000) / 10000;
}

/** 已解鎖的靈感事件組數；星等表已涵蓋，這裡只做夾取保險 */
export function unlockedEventGroupCount(star: number | undefined): number {
    return Math.min(mentorStarEntry(star).unlockedEventGroups, MENTOR_EVENT_GROUP_COUNT);
}

/**
 * 又抽到同名教官卡時的判定：Current_Star < 5 → 突破 +1；== 5 → 溢出。
 * 只回傳結果，不改傳入的星等；呼叫端負責寫回。
 */
export function applyDuplicateMentorCard(currentStar: number | undefined): MentorDuplicateResult {
    const star = clampMentorStar(currentStar);
    if (star >= MENTOR_MAX_STAR) return { kind: 'overflow', star };
    return { kind: 'breakthrough', star: star + 1 };
}
