// @spec-source → 兵種（虎符）系統.md：一將一符、一符一將、陣亡退回君主、君主沒收（PROG-2-0233，WBS TRP-08）
/**
 * TigerTallyHoldings — 虎符持有關係（純邏輯，不依賴 cc）
 *
 * 每張虎符同一時間只能有一個持有者（武將 id），或由君主持有（null）。
 * 每位武將同時最多持有一張虎符。所有操作回傳新狀態，不改傳入的狀態。
 *
 * 規格的「轉交」在 TigerTallyLoyalty 已有季次規則，這裡只改持有關係。
 *
 * Unity 對照：像一張 Inventory 表，一個 key（虎符）對應一個 owner，操作前先檢查唯一性。
 */

/** null = 君主持有 */
export type TallyHolder = string | null;

export interface TallyHoldings {
    /** 虎符 uid → 持有者（null 為君主） */
    readonly holders: Readonly<Record<string, TallyHolder>>;
}

export type TallyHoldingsFailReason = 'UNKNOWN_TALLY' | 'ALREADY_HELD' | 'NOT_HELD' | 'GENERAL_HAS_TALLY';

export type TallyHoldingsResult =
    | { ok: true; state: TallyHoldings }
    | { ok: false; reason: TallyHoldingsFailReason; state: TallyHoldings };

/** 所有虎符起始都由君主持有 */
export function createTallyHoldings(cardUids: readonly string[]): TallyHoldings {
    const holders: Record<string, TallyHolder> = {};
    for (const uid of cardUids) holders[uid] = null;
    return { holders };
}

export function holderOf(state: TallyHoldings, cardUid: string): TallyHolder | undefined {
    return state.holders[cardUid];
}

/** 武將目前持有的虎符（至多一張，回傳 uid 或 null） */
export function tallyOfGeneral(state: TallyHoldings, generalId: string): string | null {
    for (const [uid, holder] of Object.entries(state.holders)) {
        if (holder === generalId) return uid;
    }
    return null;
}

function withHolder(state: TallyHoldings, cardUid: string, holder: TallyHolder): TallyHoldings {
    return { holders: { ...state.holders, [cardUid]: holder } };
}

/** 裝上：虎符必須由君主持有（不能直接搶別人的），且武將手上不能已有一張 */
export function equipTally(state: TallyHoldings, cardUid: string, generalId: string): TallyHoldingsResult {
    if (!(cardUid in state.holders)) return { ok: false, reason: 'UNKNOWN_TALLY', state };
    if (state.holders[cardUid] !== null) return { ok: false, reason: 'ALREADY_HELD', state };
    if (tallyOfGeneral(state, generalId) !== null) return { ok: false, reason: 'GENERAL_HAS_TALLY', state };
    return { ok: true, state: withHolder(state, cardUid, generalId) };
}

/** 卸下：虎符退回君主 */
export function unequipTally(state: TallyHoldings, cardUid: string): TallyHoldingsResult {
    if (!(cardUid in state.holders)) return { ok: false, reason: 'UNKNOWN_TALLY', state };
    if (state.holders[cardUid] === null) return { ok: false, reason: 'NOT_HELD', state };
    return { ok: true, state: withHolder(state, cardUid, null) };
}

/** 轉交：虎符從現任持有者（或君主）交給另一位武將，對方手上不能已有一張 */
export function transferTally(state: TallyHoldings, cardUid: string, toGeneralId: string): TallyHoldingsResult {
    if (!(cardUid in state.holders)) return { ok: false, reason: 'UNKNOWN_TALLY', state };
    if (state.holders[cardUid] === toGeneralId) return { ok: true, state };
    if (tallyOfGeneral(state, toGeneralId) !== null) return { ok: false, reason: 'GENERAL_HAS_TALLY', state };
    return { ok: true, state: withHolder(state, cardUid, toGeneralId) };
}

/** 陣亡：該武將持有的虎符退回君主，回傳退回的 uid 清單 */
export function onGeneralDeath(state: TallyHoldings, generalId: string): { state: TallyHoldings; returned: string[] } {
    const returned = Object.entries(state.holders).filter(([, holder]) => holder === generalId).map(([uid]) => uid);
    const holders = { ...state.holders };
    for (const uid of returned) holders[uid] = null;
    return { state: { holders }, returned };
}

/** 君主沒收：與陣亡同樣退回君主，回傳被沒收的 uid 清單（沒收降忠由 TigerTallyLoyalty 處理） */
export function confiscateFrom(state: TallyHoldings, generalId: string): { state: TallyHoldings; confiscated: string[] } {
    const { state: next, returned } = onGeneralDeath(state, generalId);
    return { state: next, confiscated: returned };
}
