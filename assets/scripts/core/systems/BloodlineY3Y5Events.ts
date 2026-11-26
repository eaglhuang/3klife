// @spec-source → PROG-2-10055 血統第 3~5 年成長小事件資料（Antigravity）；PROG-2-10057 載入器與觸發邏輯
/**
 * BloodlineY3Y5Events — 血統第 3～5 年成長小事件（純邏輯，不依賴 cc）
 *
 * 職責：載入並驗證 bloodline-y3y5-events.json、依年份／年齡挑出該觸發的事件、
 * 記錄「哪個孩子在哪個事件選了哪個選項」（每孩子每事件一生只觸發一次）、
 * 把選項效果整理成唯一的效果清單，並提供存檔欄位 normalize（舊存檔缺欄位視為沒觸發過）。
 * 不負責：效果實際入帳（好感、銀兩、聲望、小名碎片、同窗好友要接各自的系統，見任務卡 PROG-2-10057 調查）與彈窗畫面。
 *
 * 銀兩是家族資金（走 SilverWalletPort）；金是國家資金。資料裡寫 gold 一律判為錯誤，避免誤扣國庫。
 */
import eventsData from '../../../resources/data/master/bloodline-y3y5-events.json';

/** 資料格式版本 */
export const BLOODLINE_Y3Y5_SCHEMA_VERSION = 1;

/** 事件可觸發的培育年（第 3～5 年各一件） */
export const BLOODLINE_EVENT_YEARS: readonly number[] = [3, 4, 5];

/** 首年送來的幼苗 7 歲、一年長一歲：培育第 N 年時孩子 N + 6 歲（第 3～5 年對應 9～11 歲） */
export const BLOODLINE_EVENT_AGE_OFFSET = 6;

/** 事件選項 id（固定二選一） */
export const BLOODLINE_OPTION_IDS = ['A', 'B'] as const;
export type BloodlineOptionId = typeof BLOODLINE_OPTION_IDS[number];

/** 屬性加減（直接加在孩子的五維上） */
export const BLOODLINE_STAT_KEYS = ['str', 'int', 'lea', 'pol', 'cha'] as const;
export type BloodlineStatKey = typeof BLOODLINE_STAT_KEYS[number];

/** 數字型效果（好感、銀兩、聲望、小名圖鑑碎片）；屬性另外列在 BLOODLINE_STAT_KEYS */
const NUMERIC_EFFECT_KEYS = ['favor', 'silver', 'prestige', 'epithetFragments'] as const;
/** 布林型效果（結識同窗好友） */
const FLAG_EFFECT_KEYS = ['friendUnlocked'] as const;

/** 選項效果（全部可省略；數字可為負，例如 favor -2、silver -50） */
export interface BloodlineEventEffects {
    str?: number;
    int?: number;
    lea?: number;
    pol?: number;
    cha?: number;
    /** 親子好感 */
    favor?: number;
    /** 家族銀兩（不是國家的金） */
    silver?: number;
    /** 家族聲望 */
    prestige?: number;
    /** 天賦小名圖鑑碎片 */
    epithetFragments?: number;
    /** 結識一位同窗好友 */
    friendUnlocked?: boolean;
}

export interface BloodlineEventOption {
    id: BloodlineOptionId;
    labelKey: string;
    resultKey: string;
    effects: BloodlineEventEffects;
}

export interface BloodlineEvent {
    id: string;
    triggerYear: number;
    titleKey: string;
    descKey: string;
    options: readonly [BloodlineEventOption, BloodlineEventOption];
}

export interface BloodlineEventTable {
    schemaVersion: number;
    events: readonly BloodlineEvent[];
}

/** 驗證資料：回傳錯誤清單，空陣列代表合格。不丟例外，方便測試逐條對照。 */
export function validateBloodlineY3Y5Events(raw: unknown): string[] {
    const errors: string[] = [];
    if (!raw || typeof raw !== 'object') return ['根節點必須是物件'];
    const root = raw as Record<string, unknown>;
    if (root.schemaVersion !== BLOODLINE_Y3Y5_SCHEMA_VERSION) errors.push(`schemaVersion 必須是 ${BLOODLINE_Y3Y5_SCHEMA_VERSION}`);
    if (!Array.isArray(root.events) || root.events.length === 0) return [...errors, 'events 必須是非空陣列'];

    const ids = new Set<string>();
    const years = new Set<number>();
    root.events.forEach((entry, index) => {
        const at = `events[${index}]`;
        if (!entry || typeof entry !== 'object') {
            errors.push(`${at} 必須是物件`);
            return;
        }
        const ev = entry as Record<string, unknown>;
        if (!isNonEmptyString(ev.id)) errors.push(`${at}.id 必須是非空字串`);
        else if (ids.has(ev.id)) errors.push(`${at}.id 重複：${ev.id}`);
        else ids.add(ev.id);
        if (typeof ev.triggerYear !== 'number' || !BLOODLINE_EVENT_YEARS.includes(ev.triggerYear)) errors.push(`${at}.triggerYear 必須是 ${BLOODLINE_EVENT_YEARS.join('/')} 其中之一`);
        else if (years.has(ev.triggerYear)) errors.push(`${at}.triggerYear 重複：第 ${ev.triggerYear} 年只能有一件`);
        else years.add(ev.triggerYear);
        for (const key of ['titleKey', 'descKey'] as const) {
            if (!isNonEmptyString(ev[key])) errors.push(`${at}.${key} 必須是非空字串`);
        }
        validateOptions(ev.options, at, errors);
    });
    for (const year of BLOODLINE_EVENT_YEARS) {
        if (!years.has(year)) errors.push(`缺少第 ${year} 年的事件`);
    }
    return errors;
}

function validateOptions(options: unknown, at: string, errors: string[]): void {
    if (!Array.isArray(options) || options.length !== BLOODLINE_OPTION_IDS.length) {
        errors.push(`${at}.options 必須剛好 ${BLOODLINE_OPTION_IDS.length} 個選項`);
        return;
    }
    options.forEach((entry, index) => {
        const opt = `${at}.options[${index}]`;
        if (!entry || typeof entry !== 'object') {
            errors.push(`${opt} 必須是物件`);
            return;
        }
        const o = entry as Record<string, unknown>;
        if (o.id !== BLOODLINE_OPTION_IDS[index]) errors.push(`${opt}.id 必須是 ${BLOODLINE_OPTION_IDS[index]}`);
        for (const key of ['labelKey', 'resultKey'] as const) {
            if (!isNonEmptyString(o[key])) errors.push(`${opt}.${key} 必須是非空字串`);
        }
        validateEffects(o.effects, opt, errors);
    });
}

function validateEffects(effects: unknown, at: string, errors: string[]): void {
    if (!effects || typeof effects !== 'object' || Array.isArray(effects)) {
        errors.push(`${at}.effects 必須是物件`);
        return;
    }
    const numeric: readonly string[] = [...BLOODLINE_STAT_KEYS, ...NUMERIC_EFFECT_KEYS];
    const flags: readonly string[] = FLAG_EFFECT_KEYS;
    const entries = Object.entries(effects as Record<string, unknown>);
    if (entries.length === 0) errors.push(`${at}.effects 不可為空（選項至少要有一項效果）`);
    for (const [key, value] of entries) {
        if (key === 'gold') errors.push(`${at}.effects.gold 不合法：家族資金請用 silver，金是國家資金`);
        else if (numeric.includes(key)) {
            if (typeof value !== 'number' || !Number.isInteger(value)) errors.push(`${at}.effects.${key} 必須是整數`);
        } else if (flags.includes(key)) {
            if (typeof value !== 'boolean') errors.push(`${at}.effects.${key} 必須是布林`);
        } else errors.push(`${at}.effects 含未知欄位：${key}`);
    }
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

/** 載入並驗證事件表；資料不合格直接丟例外（資料錯誤要在開機就發現，不靜默吞掉）。 */
export function loadBloodlineY3Y5Events(raw: unknown = eventsData): BloodlineEventTable {
    const errors = validateBloodlineY3Y5Events(raw);
    if (errors.length > 0) throw new Error(`bloodline-y3y5-events 資料不合格：${errors.join('；')}`);
    const table = raw as BloodlineEventTable;
    return { schemaVersion: table.schemaVersion, events: [...table.events].sort((a, b) => a.triggerYear - b.triggerYear) };
}

/** 培育年 → 孩子年齡（第 3～5 年 = 9～11 歲） */
export function bloodlineEventAgeOfYear(year: number): number {
    return year + BLOODLINE_EVENT_AGE_OFFSET;
}

// ───────── 存檔：已觸發紀錄 ─────────

/** 一筆已觸發紀錄：哪個孩子、哪個事件、選了哪個選項、發生在遊戲第幾年 */
export interface BloodlineEventRecord {
    childId: string;
    eventId: string;
    optionId: BloodlineOptionId;
    year: number;
}

/** 存檔欄位（存於 resources.bloodlineEventRecords；舊存檔沒有此欄位） */
export interface BloodlineEventState {
    records: BloodlineEventRecord[];
}

export function emptyBloodlineEventState(): BloodlineEventState {
    return { records: [] };
}

/** 讀檔 normalize：舊存檔 / 壞資料一律回傳可用狀態；同一孩子同一事件只留第一筆。 */
export function normalizeBloodlineEventState(raw: unknown): BloodlineEventState {
    const list = (raw as { records?: unknown } | null | undefined)?.records;
    if (!Array.isArray(list)) return emptyBloodlineEventState();
    const seen = new Set<string>();
    const records: BloodlineEventRecord[] = [];
    for (const entry of list) {
        if (!entry || typeof entry !== 'object') continue;
        const r = entry as Partial<BloodlineEventRecord>;
        if (!isNonEmptyString(r.childId) || !isNonEmptyString(r.eventId)) continue;
        if (!BLOODLINE_OPTION_IDS.includes(r.optionId as BloodlineOptionId)) continue;
        const key = `${r.childId}|${r.eventId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        records.push({ childId: r.childId, eventId: r.eventId, optionId: r.optionId as BloodlineOptionId, year: typeof r.year === 'number' && Number.isFinite(r.year) ? r.year : 0 });
    }
    return { records };
}

export function hasTriggeredBloodlineEvent(state: BloodlineEventState, childId: string, eventId: string): boolean {
    return state.records.some((r) => r.childId === childId && r.eventId === eventId);
}

// ───────── 觸發與結算 ─────────

/** 孩子目前的位置：給培育年或年齡其中一個即可（兩個都給以培育年為準）。 */
export interface BloodlineEventTiming {
    year?: number;
    age?: number;
}

/**
 * 這個孩子此刻該觸發哪一件事件；沒有（年份不在 3～5、已觸發過）回 null。
 * 只比對「當年」的事件：錯過那一年（例如當年沒進歲末結算）不補發，避免一次跳出多個彈窗。
 */
export function dueBloodlineEvent(table: BloodlineEventTable, state: BloodlineEventState, childId: string, timing: BloodlineEventTiming): BloodlineEvent | null {
    const year = timing.year ?? (typeof timing.age === 'number' ? timing.age - BLOODLINE_EVENT_AGE_OFFSET : NaN);
    if (!Number.isInteger(year)) return null;
    const event = table.events.find((e) => e.triggerYear === year);
    if (!event || hasTriggeredBloodlineEvent(state, childId, event.id)) return null;
    return event;
}

export type BloodlineChoiceFailure = 'unknown-event' | 'unknown-option' | 'already-triggered';

export type BloodlineChoiceOutcome =
    | { ok: true; state: BloodlineEventState; event: BloodlineEvent; option: BloodlineEventOption; effects: BloodlineEventEffects; resultKey: string }
    | { ok: false; reason: BloodlineChoiceFailure; state: BloodlineEventState };

/** 玩家選定選項：寫入紀錄並回傳效果與結果文字 key。失敗不改狀態；同一孩子同一事件第二次選一律擋下。 */
export function chooseBloodlineEventOption(
    table: BloodlineEventTable,
    state: BloodlineEventState,
    childId: string,
    eventId: string,
    optionId: string,
    year: number,
): BloodlineChoiceOutcome {
    const event = table.events.find((e) => e.id === eventId);
    if (!event) return { ok: false, reason: 'unknown-event', state };
    const option = event.options.find((o) => o.id === optionId);
    if (!option) return { ok: false, reason: 'unknown-option', state };
    if (hasTriggeredBloodlineEvent(state, childId, eventId)) return { ok: false, reason: 'already-triggered', state };
    const next: BloodlineEventState = { records: [...state.records, { childId, eventId, optionId: option.id, year }] };
    return { ok: true, state: next, event, option, effects: { ...option.effects }, resultKey: option.resultKey };
}

/** 效果裡的屬性加減（只含有填的五維）；用來加到孩子的 str/int/lea/pol/cha。 */
export function bloodlineStatDeltas(effects: BloodlineEventEffects): Partial<Record<BloodlineStatKey, number>> {
    const out: Partial<Record<BloodlineStatKey, number>> = {};
    for (const key of BLOODLINE_STAT_KEYS) {
        const value = effects[key];
        if (typeof value === 'number' && value !== 0) out[key] = value;
    }
    return out;
}

/** 此效果需要先確認的家族銀兩支出（正數；沒有支出回 0）。入帳要走銀兩錢包，不可直接改餘額。 */
export function bloodlineSilverCost(effects: BloodlineEventEffects): number {
    return typeof effects.silver === 'number' && effects.silver < 0 ? -effects.silver : 0;
}
