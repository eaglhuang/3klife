// @spec-source → PROG-2-10059 歲末結算接血統成長事件；PROG-2-10057 BloodlineY3Y5Events（觸發與一次性邏輯）
/**
 * BloodlineGrowthSettlement — 歲末結算排出「待決成長事件」佇列（純邏輯，不依賴 cc）
 *
 * 歲末（換年）時，對每位 9～11 歲子嗣呼叫 dueBloodlineEvent：該歲數對應的事件還沒觸發過，就排進待決佇列，等玩家選擇。
 * - 待決佇列存檔（舊存檔缺欄位視為空）；同一孩子同一事件只會排一次；已觸發紀錄在 BloodlineEventState。
 * - 只排「當年」的事件：錯過那一年（沒進歲末結算）不補發，避免一次跳出多個彈窗（沿用 dueBloodlineEvent 的規則）。
 * - 不負責入帳（屬性、好感、銀兩、聲望、碎片、同窗好友由 GameSession.resolveBloodlineEvent 入帳）與彈窗畫面。
 * 存檔欄位：PlayerSaveSnapshot.bloodlineGrowthEvents = { records（已觸發紀錄）, pending（待決佇列） }，兩者皆空不寫；舊存檔缺欄位視為空。
 */
import {
    bloodlineStatDeltas,
    chooseBloodlineEventOption,
    dueBloodlineEvent,
    hasTriggeredBloodlineEvent,
    normalizeBloodlineEventState,
    type BloodlineChoiceFailure,
    type BloodlineEvent,
    type BloodlineEventEffects,
    type BloodlineEventOption,
    type BloodlineEventState,
    type BloodlineEventTable,
    type BloodlineStatKey,
} from './BloodlineY3Y5Events';
import {
    addChildFavor,
    addClassmateFriend,
    addEpithetFragments,
    type BloodlineChildLedgerState,
} from './BloodlineChildLedger';

/** 一筆待決事件：哪個孩子、哪個事件、排入時是遊戲第幾年 */
export interface PendingBloodlineEvent {
    childId: string;
    eventId: string;
    year: number;
}

/** 歲末結算要看的孩子（只需 id 與年齡） */
export interface BloodlineGrowthChild {
    id: string;
    age?: number;
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

/** 孩子年齡取整歲（一季 +0.25，換年時剛好整數；容許浮點誤差） */
export function bloodlineGrowthAgeOf(age: number): number {
    return Math.floor(age + 1e-9);
}

export function hasPendingBloodlineEvent(pending: readonly PendingBloodlineEvent[], childId: string, eventId: string): boolean {
    return pending.some((p) => p.childId === childId && p.eventId === eventId);
}

/** 讀檔 normalize：壞資料丟棄、同一孩子同一事件只留第一筆；缺欄位（舊存檔）回空陣列 */
export function normalizePendingBloodlineEvents(raw: unknown): PendingBloodlineEvent[] {
    if (!Array.isArray(raw)) return [];
    const out: PendingBloodlineEvent[] = [];
    for (const entry of raw) {
        if (!entry || typeof entry !== 'object') continue;
        const p = entry as Partial<PendingBloodlineEvent>;
        if (!isNonEmptyString(p.childId) || !isNonEmptyString(p.eventId)) continue;
        if (hasPendingBloodlineEvent(out, p.childId, p.eventId)) continue;
        out.push({ childId: p.childId, eventId: p.eventId, year: typeof p.year === 'number' && Number.isFinite(p.year) ? p.year : 0 });
    }
    return out;
}

// ───────── 存檔欄位 ─────────

/** 存檔：已觸發紀錄＋待決佇列 */
export interface BloodlineGrowthSave {
    records: BloodlineEventState['records'];
    pending: PendingBloodlineEvent[];
}

export function normalizeBloodlineGrowthSave(raw: unknown): { state: BloodlineEventState; pending: PendingBloodlineEvent[] } {
    const src = (raw ?? {}) as { records?: unknown; pending?: unknown };
    return { state: normalizeBloodlineEventState({ records: src.records }), pending: normalizePendingBloodlineEvents(src.pending) };
}

export function isEmptyBloodlineGrowth(state: BloodlineEventState, pending: readonly PendingBloodlineEvent[]): boolean {
    return state.records.length === 0 && pending.length === 0;
}

export interface BloodlineGrowthQueueResult {
    /** 排完後的完整待決佇列 */
    pending: PendingBloodlineEvent[];
    /** 這次新排入的 */
    added: PendingBloodlineEvent[];
}

/**
 * 歲末排程：children 是目前活著、屬於家族的孩子；year 是剛進入的遊戲曆年（排入紀錄用）。
 * 沒有年齡的孩子、年齡不在 9～11 歲、已觸發過或已在佇列的都略過。
 */
export function queueBloodlineGrowthEvents(
    table: BloodlineEventTable,
    state: BloodlineEventState,
    pending: readonly PendingBloodlineEvent[],
    children: readonly BloodlineGrowthChild[],
    year: number,
): BloodlineGrowthQueueResult {
    const next = [...pending];
    const added: PendingBloodlineEvent[] = [];
    for (const child of children) {
        if (typeof child.age !== 'number' || !Number.isFinite(child.age)) continue;
        const due = dueBloodlineEvent(table, state, child.id, { age: bloodlineGrowthAgeOf(child.age) });
        if (!due || hasTriggeredBloodlineEvent(state, child.id, due.id) || hasPendingBloodlineEvent(next, child.id, due.id)) continue;
        const entry: PendingBloodlineEvent = { childId: child.id, eventId: due.id, year };
        next.push(entry);
        added.push(entry);
    }
    return { pending: next, added };
}

// ───────── 玩家選擇後的結算 ─────────

export type BloodlineResolveFailure = BloodlineChoiceFailure | 'not-pending';

export type BloodlineResolveOutcome =
    | {
        ok: true;
        state: BloodlineEventState;
        pending: PendingBloodlineEvent[];
        event: BloodlineEvent;
        option: BloodlineEventOption;
        effects: BloodlineEventEffects;
        resultKey: string;
    }
    | { ok: false; reason: BloodlineResolveFailure };

/**
 * 玩家對一件待決事件做出選擇：必須真的在待決佇列裡（不能憑空領獎勵）；
 * 通過就寫入已觸發紀錄並自佇列移除。失敗不改任何狀態。
 */
export function resolvePendingBloodlineEvent(
    table: BloodlineEventTable,
    state: BloodlineEventState,
    pending: readonly PendingBloodlineEvent[],
    childId: string,
    eventId: string,
    optionId: string,
    year: number,
): BloodlineResolveOutcome {
    if (!hasPendingBloodlineEvent(pending, childId, eventId)) return { ok: false, reason: 'not-pending' };
    const chosen = chooseBloodlineEventOption(table, state, childId, eventId, optionId, year);
    if (!chosen.ok) return { ok: false, reason: chosen.reason };
    return {
        ok: true,
        state: chosen.state,
        pending: pending.filter((p) => !(p.childId === childId && p.eventId === eventId)),
        event: chosen.event,
        option: chosen.option,
        effects: chosen.effects,
        resultKey: chosen.resultKey,
    };
}

/** 把效果裡屬於帳本的部分（親子好感、小名碎片、同窗好友）入帳；回傳新帳本，不改傳入的物件。 */
export function applyBloodlineEffectsToLedger(ledger: BloodlineChildLedgerState, childId: string, effects: BloodlineEventEffects): BloodlineChildLedgerState {
    let next = ledger;
    if (typeof effects.favor === 'number' && effects.favor !== 0) next = addChildFavor(next, childId, effects.favor);
    if (typeof effects.epithetFragments === 'number' && effects.epithetFragments > 0) next = addEpithetFragments(next, effects.epithetFragments);
    if (effects.friendUnlocked === true) next = addClassmateFriend(next, childId);
    return next;
}

/** 屬性上限 */
export const BLOODLINE_STAT_CAP = 100;

/** 屬性加減落在孩子身上：回傳新的五維（上限 100、下限 0）；沒有屬性效果回 null */
export function applyBloodlineStatDeltas(stats: Readonly<Record<BloodlineStatKey, number>>, effects: BloodlineEventEffects): Record<BloodlineStatKey, number> | null {
    const deltas = bloodlineStatDeltas(effects);
    const keys = Object.keys(deltas) as BloodlineStatKey[];
    if (keys.length === 0) return null;
    const next = { ...stats };
    for (const key of keys) next[key] = Math.max(0, Math.min(BLOODLINE_STAT_CAP, (stats[key] ?? 0) + (deltas[key] as number)));
    return next;
}
