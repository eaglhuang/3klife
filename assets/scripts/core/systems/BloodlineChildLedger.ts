// @spec-source → PROG-2-10058 幼苗與親子資料基礎；PROG-2-10057 調查缺口 2～4（親子好感、天賦小名碎片、同窗好友）
/**
 * BloodlineChildLedger — 親子好感、天賦小名圖鑑碎片、同窗好友旗標的存檔帳本（純邏輯，不依賴 cc）
 *
 * 職責：把三項「跟子嗣成長有關的小數值」收進同一份存檔欄位，提供不可變更新與讀檔 normalize
 * （舊存檔沒有此欄位 → 視為空帳本，壞值丟棄，不拋錯，保護玩家存檔）。
 * - 親子好感：每位子嗣一個值（0～100），沒紀錄時視為 CHILD_FAVOR_DEFAULT。與配偶／傭兵的 _bondAffinityOf、成對友誼 FriendshipService 無關。
 * - 天賦小名圖鑑碎片：家族共用的一個總數（BloodlineEpithetService 本身是無狀態純函式，碎片數由這裡存）。
 * - 同窗好友：每位子嗣已結識幾位同窗好友（>0 即有旗標）。
 * - 親子談話（PROG-2-10070）：每位子嗣最近談話的年份、累計談話次數（話題輪替用）、本年親子互動次數（跨年自動歸零，供首年目標清單）。
 *
 * 寫入權威在 GameSession（單機）：玩法與 UI 只送意圖給共通 API（family.*），不直接改這份帳本。
 * 存檔欄位：PlayerSaveSnapshot.bloodlineChildLedger（空帳本不寫）。
 */

export const CHILD_LEDGER_VERSION = 1 as const;

/** 親子好感範圍與預設值（暫定，PM 可調） */
export const CHILD_FAVOR_MIN = 0;
export const CHILD_FAVOR_MAX = 100;
export const CHILD_FAVOR_DEFAULT = 30;

export interface BloodlineChildLedgerState {
    v: typeof CHILD_LEDGER_VERSION;
    /** 子嗣 id → 親子好感（只存有紀錄的孩子） */
    favor: Record<string, number>;
    /** 天賦小名圖鑑碎片總數（家族共用） */
    epithetFragments: number;
    /** 子嗣 id → 已結識的同窗好友數 */
    classmateFriends: Record<string, number>;
    /** 子嗣 id → 最近一次親子談話的遊戲曆年（沒談過不存） */
    talkYear: Record<string, number>;
    /** 子嗣 id → 累計親子談話次數（話題輪替用） */
    talkCount: Record<string, number>;
    /** 親子互動計數：記錄年份與該年次數；年份不是當年就視為 0 */
    interaction: { year: number; count: number };
}

export function emptyChildLedger(): BloodlineChildLedgerState {
    return { v: CHILD_LEDGER_VERSION, favor: {}, epithetFragments: 0, classmateFriends: {}, talkYear: {}, talkCount: {}, interaction: { year: 0, count: 0 } };
}

export function isEmptyChildLedger(state: BloodlineChildLedgerState | null | undefined): boolean {
    return !state
        || (Object.keys(state.favor).length === 0 && state.epithetFragments === 0 && Object.keys(state.classmateFriends).length === 0
            && Object.keys(state.talkYear).length === 0 && Object.keys(state.talkCount).length === 0 && state.interaction.count === 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function clampChildFavor(value: number): number {
    return Math.min(CHILD_FAVOR_MAX, Math.max(CHILD_FAVOR_MIN, Math.round(value)));
}

function normalizeNumberMap(raw: unknown, map: (value: number) => number | null): Record<string, number> {
    const out: Record<string, number> = {};
    if (!isRecord(raw)) return out;
    for (const [id, value] of Object.entries(raw)) {
        if (id === '' || typeof value !== 'number' || !Number.isFinite(value)) continue;
        const mapped = map(value);
        if (mapped !== null) out[id] = mapped;
    }
    return out;
}

/** 讀檔 normalize：缺欄位／壞資料回可用狀態；好感夾在範圍內，碎片與好友數取非負整數 */
export function normalizeChildLedger(raw: unknown): BloodlineChildLedgerState {
    if (!isRecord(raw)) return emptyChildLedger();
    const fragments = typeof raw.epithetFragments === 'number' && Number.isFinite(raw.epithetFragments) ? Math.max(0, Math.floor(raw.epithetFragments)) : 0;
    return {
        v: CHILD_LEDGER_VERSION,
        favor: normalizeNumberMap(raw.favor, clampChildFavor),
        epithetFragments: fragments,
        classmateFriends: normalizeNumberMap(raw.classmateFriends, (n) => (Math.floor(n) > 0 ? Math.floor(n) : null)),
        // 舊存檔沒有親子談話欄位：視為從沒談過
        talkYear: normalizeNumberMap(raw.talkYear, (n) => (Math.floor(n) > 0 ? Math.floor(n) : null)),
        talkCount: normalizeNumberMap(raw.talkCount, (n) => (Math.floor(n) > 0 ? Math.floor(n) : null)),
        interaction: normalizeInteraction(raw.interaction),
    };
}

function normalizeInteraction(raw: unknown): { year: number; count: number } {
    if (!isRecord(raw)) return { year: 0, count: 0 };
    const year = typeof raw.year === 'number' && Number.isFinite(raw.year) ? Math.max(0, Math.floor(raw.year)) : 0;
    const count = typeof raw.count === 'number' && Number.isFinite(raw.count) ? Math.max(0, Math.floor(raw.count)) : 0;
    return count > 0 && year > 0 ? { year, count } : { year: 0, count: 0 };
}

export function cloneChildLedger(state: BloodlineChildLedgerState): BloodlineChildLedgerState {
    return {
        v: CHILD_LEDGER_VERSION,
        favor: { ...state.favor },
        epithetFragments: state.epithetFragments,
        classmateFriends: { ...state.classmateFriends },
        talkYear: { ...state.talkYear },
        talkCount: { ...state.talkCount },
        interaction: { ...state.interaction },
    };
}

/** 親子好感；沒紀錄的孩子回預設值 */
export function childFavorOf(state: BloodlineChildLedgerState, childId: string): number {
    return Object.prototype.hasOwnProperty.call(state.favor, childId) ? state.favor[childId] : CHILD_FAVOR_DEFAULT;
}

/** 設定好感起始值（例如開局幼苗）；已有紀錄就保留，不覆蓋 */
export function seedChildFavor(state: BloodlineChildLedgerState, childId: string, initial: number): BloodlineChildLedgerState {
    if (childId === '' || Object.prototype.hasOwnProperty.call(state.favor, childId)) return state;
    const next = cloneChildLedger(state);
    next.favor[childId] = clampChildFavor(initial);
    return next;
}

/** 好感加減（可為負），結果夾在 0～100；孩子 id 為空或 delta 非有限數回原狀態 */
export function addChildFavor(state: BloodlineChildLedgerState, childId: string, delta: number): BloodlineChildLedgerState {
    if (childId === '' || !Number.isFinite(delta)) return state;
    const next = cloneChildLedger(state);
    next.favor[childId] = clampChildFavor(childFavorOf(state, childId) + delta);
    return next;
}

/** 碎片入帳（只接受正整數；扣碎片之後有消耗玩法再加，現在不會變負） */
export function addEpithetFragments(state: BloodlineChildLedgerState, amount: number): BloodlineChildLedgerState {
    if (!Number.isInteger(amount) || amount <= 0) return state;
    const next = cloneChildLedger(state);
    next.epithetFragments += amount;
    return next;
}

/** 結識一位同窗好友 */
export function addClassmateFriend(state: BloodlineChildLedgerState, childId: string): BloodlineChildLedgerState {
    if (childId === '') return state;
    const next = cloneChildLedger(state);
    next.classmateFriends[childId] = (state.classmateFriends[childId] ?? 0) + 1;
    return next;
}

export function hasClassmateFriend(state: BloodlineChildLedgerState, childId: string): boolean {
    return (state.classmateFriends[childId] ?? 0) > 0;
}

// ───────── 親子談話（PROG-2-10070） ─────────

/** 本年親子互動次數（帳本記的不是當年就是 0；跨年自動歸零，不需要換年時清） */
export function childInteractionCountOf(state: BloodlineChildLedgerState, year: number): number {
    return state.interaction.year === year ? state.interaction.count : 0;
}

/** 記一次親子互動（談話、成長事件選擇）；跨年第一次互動從 1 重算 */
export function addChildInteraction(state: BloodlineChildLedgerState, year: number): BloodlineChildLedgerState {
    if (!Number.isFinite(year) || year <= 0) return state;
    const next = cloneChildLedger(state);
    next.interaction = { year, count: childInteractionCountOf(state, year) + 1 };
    return next;
}

/** 這位孩子今年談過了嗎（每名孩子每年一次；只記最近談話年份） */
export function childTalkedThisYear(state: BloodlineChildLedgerState, childId: string, year: number): boolean {
    return state.talkYear[childId] === year;
}

/** 累計談話次數（話題輪替） */
export function childTalkCountOf(state: BloodlineChildLedgerState, childId: string): number {
    return state.talkCount[childId] ?? 0;
}

/** 記下一次親子談話：最近談話年份、累計次數、本年互動數；好感另用 addChildFavor 入帳 */
export function recordChildTalk(state: BloodlineChildLedgerState, childId: string, year: number): BloodlineChildLedgerState {
    if (childId === '' || !Number.isFinite(year) || year <= 0) return state;
    const interacted = addChildInteraction(state, year);
    const next = cloneChildLedger(interacted);
    next.talkYear[childId] = Math.floor(year);
    next.talkCount[childId] = childTalkCountOf(state, childId) + 1;
    return next;
}
