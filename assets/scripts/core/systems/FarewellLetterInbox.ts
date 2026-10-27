// @spec-source → 留存系統.md §「告別信觸發」與字串表「告別信」；WBS RET-03（PROG-2-0982）
/**
 * FarewellLetterInbox — 傭兵告別信與收件匣（純邏輯，不依賴 cc）。
 *
 * 規格：傭兵到期（Expired）且好感 ≥20 時生成告別信；20~40 為普通、40 以上為感人。
 * 暫定：好感 20–39 為普通、40 以上為感人（規格邊界 40 歸感人）；內文沿用字串表範例，感人版文案待企劃。
 *
 * Unity 對照：像一個 Inbox ScriptableObject 存信件列表，每封信帶 isRead；UI 只讀列表與未讀數。
 */

export const FAREWELL_MIN_AFFECTION = 20;
export const FAREWELL_MOVING_AFFECTION = 40;
/** 收件匣上限（QA 2026-10-27 暫定）：只保留最新的信件。 */
export const FAREWELL_INBOX_LIMIT = 50;

export type FarewellTier = 'normal' | 'moving';

export interface FarewellLetter {
    id: string;
    uid: string;
    generalName: string;
    affection: number;
    tier: FarewellTier;
    body: string;
    day: number;
    read: boolean;
}

/** 好感不足時回傳 null（不寫信）。 */
export function farewellTierOf(affection: number): FarewellTier | null {
    if (affection < FAREWELL_MIN_AFFECTION) return null;
    return affection >= FAREWELL_MOVING_AFFECTION ? 'moving' : 'normal';
}

/** 生成告別信；好感不足時回傳 null。ID 由傭兵 uid 與到期日組成，同一人同一天只會有一封。 */
export function createFarewellLetter(input: { uid: string; generalName: string; affection: number; day: number }): FarewellLetter | null {
    const tier = farewellTierOf(input.affection);
    if (tier === null) return null;
    return {
        id: `FL-${input.uid}-${input.day}`,
        uid: input.uid,
        generalName: input.generalName,
        affection: input.affection,
        tier,
        body: `主公，短短六日，如夢似幻。願主公前程似錦——${input.generalName} 敬上`,
        day: input.day,
        read: false,
    };
}

/** 加入收件匣；ID 已存在時不重複加入，超過上限時丟棄最舊的信。不改輸入。 */
export function appendFarewellLetter(inbox: readonly FarewellLetter[], letter: FarewellLetter): FarewellLetter[] {
    if (inbox.some(item => item.id === letter.id)) return inbox.map(item => ({ ...item }));
    const next = [...inbox.map(item => ({ ...item })), { ...letter }];
    return next.length > FAREWELL_INBOX_LIMIT ? next.slice(next.length - FAREWELL_INBOX_LIMIT) : next;
}

/** 標記已讀；找不到 ID 時回傳副本，不變動。 */
export function markFarewellLetterRead(inbox: readonly FarewellLetter[], id: string): FarewellLetter[] {
    return inbox.map(item => (item.id === id ? { ...item, read: true } : { ...item }));
}

export function unreadFarewellCount(inbox: readonly FarewellLetter[]): number {
    return inbox.filter(item => !item.read).length;
}
