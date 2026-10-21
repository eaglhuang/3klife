/**
 * FriendBorrow — 好友借用教官（MENT-14，純邏輯，不依賴 cc）
 *
 * 規格（教官系統（支援卡）§L）：
 *   - 每位玩家每日可借入 1 張好友的 SSR 教官（展示教官槽）。
 *   - 同一好友的同一張卡同一天只能借 1 次。
 *   - 被借出的卡在借用期間鎖定；借用卡以「借用當下星等」快照生效，不繼承突破效果。
 *   - 原主被借出後獲得 1 點結義點數。
 *
 * Unity 對照：像一個 ScriptableObject 的借用規則表加一個 Ledger（借用紀錄清單），
 * canBorrow 是 Validator，createBorrow 是 Command；扣點數與寫存檔由呼叫端負責。
 */

/** 每位玩家每日可借入的好友教官數（§L-1）。 */
export const BORROW_DAILY_LIMIT = 1;
/** 同一好友同一張卡同一天的借用上限（§L-1）。 */
export const BORROW_SAME_CARD_DAILY_LIMIT = 1;
/** 被借出後原主獲得的結義點數（§L-1「少量 ×1」）。 */
export const BORROW_OWNER_BOND_REWARD = 1;

export interface BorrowRecord {
    id: string;
    /** 借用日（YYYY-MM-DD，由呼叫端傳入，純邏輯不讀系統時間） */
    day: string;
    borrowerId: string;
    ownerId: string;
    /** 被借卡的 template id（如 SUP_ZHAO_SSR_01） */
    supportTemplateId: string;
    /** 借用當下星等；借用期間不隨原主卡變動 */
    snapshotStar: number;
    /** 進入的培育會話 id；會話結束後 active 變為 false */
    sessionId: string;
    active: boolean;
}

export interface BorrowLedger {
    records: BorrowRecord[];
}

/** 存檔讀回：舊檔沒有欄位時為空帳本；只過濾結構（陣列、id 與 day 為字串），不逐欄驗證（PROG-2-0745） */
export function normalizeBorrowLedger(raw: unknown): BorrowLedger {
    const records = (raw as { records?: unknown } | null | undefined)?.records;
    if (!Array.isArray(records)) return { records: [] };
    const valid = records.filter((r): r is BorrowRecord => typeof r?.id === 'string' && typeof r?.day === 'string');
    return { records: valid };
}

/** 借用候選卡的資訊（呼叫端從好友的展示教官槽讀出） */
export interface BorrowCandidate {
    supportTemplateId: string;
    isSSR: boolean;
    /** 當下星等 */
    star: number;
}

export interface BorrowRequest {
    day: string;
    borrowerId: string;
    ownerId: string;
    candidate: BorrowCandidate;
    sessionId: string;
    recordId: string;
}

export type BorrowBlockReason =
    | 'SELF_BORROW'
    | 'NOT_SSR'
    | 'DAILY_LIMIT'
    | 'SAME_CARD_TODAY'
    | 'CARD_LOCKED';

export type BorrowCheck = { ok: true } | { ok: false; blocked: BorrowBlockReason };

/** 同一借用人今天已借的次數（只計 day 相同的紀錄，含已結束的）。 */
function borrowsToday(ledger: BorrowLedger, borrowerId: string, day: string): number {
    return ledger.records.filter((r) => r.borrowerId === borrowerId && r.day === day).length;
}

/**
 * 判定能否借用。檢查順序固定，回傳第一個擋下的原因，方便 UI 顯示單一提示。
 */
export function canBorrow(ledger: BorrowLedger, request: BorrowRequest): BorrowCheck {
    const { borrowerId, ownerId, day, candidate } = request;
    if (borrowerId === ownerId) return { ok: false, blocked: 'SELF_BORROW' };
    if (!candidate.isSSR) return { ok: false, blocked: 'NOT_SSR' };
    if (borrowsToday(ledger, borrowerId, day) >= BORROW_DAILY_LIMIT) return { ok: false, blocked: 'DAILY_LIMIT' };
    const sameCardToday = ledger.records.filter((r) =>
        r.borrowerId === borrowerId && r.day === day && r.ownerId === ownerId && r.supportTemplateId === candidate.supportTemplateId,
    ).length;
    if (sameCardToday >= BORROW_SAME_CARD_DAILY_LIMIT) return { ok: false, blocked: 'SAME_CARD_TODAY' };
    // 被借出的卡在借用中不可再被借出到另一場培育（同一原主同一張卡只能有一筆 active）
    const locked = ledger.records.some((r) => r.active && r.ownerId === ownerId && r.supportTemplateId === candidate.supportTemplateId);
    if (locked) return { ok: false, blocked: 'CARD_LOCKED' };
    return { ok: true };
}

export interface BorrowOutcome {
    ledger: BorrowLedger;
    record: BorrowRecord;
    /** 原主應得的結義點數（由呼叫端加到 bondPoints） */
    ownerBondReward: number;
}

/** 建立借用紀錄；先過 canBorrow，失敗時回傳 null 且不改 ledger。 */
export function createBorrow(ledger: BorrowLedger, request: BorrowRequest): BorrowOutcome | null {
    if (!canBorrow(ledger, request).ok) return null;
    const record: BorrowRecord = {
        id: request.recordId,
        day: request.day,
        borrowerId: request.borrowerId,
        ownerId: request.ownerId,
        supportTemplateId: request.candidate.supportTemplateId,
        snapshotStar: request.candidate.star,
        sessionId: request.sessionId,
        active: true,
    };
    return {
        ledger: { records: [...ledger.records, record] },
        record,
        ownerBondReward: BORROW_OWNER_BOND_REWARD,
    };
}

/** 培育會話結束時解除鎖定（借用卡回到原主手上；紀錄保留供當日上限判定）。 */
export function releaseBorrowsForSession(ledger: BorrowLedger, sessionId: string): BorrowLedger {
    if (!ledger.records.some((r) => r.active && r.sessionId === sessionId)) return ledger;
    return {
        records: ledger.records.map((r) => (r.active && r.sessionId === sessionId ? { ...r, active: false } : r)),
    };
}

/** 借入卡的生效星等：只用快照，不讀原主卡的當前星等或突破效果。 */
export function effectiveBorrowedStar(record: BorrowRecord): number {
    return record.snapshotStar;
}
