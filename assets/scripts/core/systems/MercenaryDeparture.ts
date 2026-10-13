// @spec-source → WBS v3 MERC-05（退場流程：到期未結義離隊、告別信）與 30 天冷卻；傭兵系統規格書：試用轉永久 §5 冷卻限制
/**
 * MercenaryDeparture — 傭兵試用到期的退場與 30 天冷卻純邏輯，不依賴 cc。
 *
 * 在每日結算（rollover）時呼叫：試用倒數已歸零、仍未結義者離隊，發告別信事件，
 * 並開始 30 天冷卻（同一武將在冷卻期間不會再出現在傭兵池）。
 * 結義成功者也會開始冷卻，供傭兵池判定使用。
 *
 * 冷卻以「天」計，與規格「30 天內」一致；遊戲時鐘目前是季，換算由後續工單決定。
 * 告別信只發 textKey，正文待 P1 字串表定案。尚未接到大廳、傭兵池或存檔。
 *
 * Unity 對照：像 Timer 列表，每筆紀錄 availableOnDay，判斷時比較今日。
 */

export const POOL_COOLDOWN_DAYS = 30;
export const FAREWELL_TEXT_KEY = 'UI_MERC_FAREWELL';

export type DepartureStatus = 'Trial' | 'Bonded' | 'Expired';

export interface MercenaryRecord {
    uid: string;
    status: DepartureStatus;
    daysLeft: number;
}

export interface PoolCooldown {
    uid: string;
    /** 冷卻結束的日序（含）；今日 >= 此值即可再次出現。 */
    availableOnDay: number;
}

export type DepartureReason = 'trial-expired' | 'upkeep-unpaid';

export type DepartureEvent =
    | { type: 'departed'; uid: string; reason: DepartureReason }
    | { type: 'farewell-letter'; uid: string; textKey: typeof FAREWELL_TEXT_KEY }
    | { type: 'cooldown-started'; uid: string; availableOnDay: number };

export interface DepartureResult {
    record: MercenaryRecord;
    cooldowns: PoolCooldown[];
    departed: boolean;
    events: DepartureEvent[];
}

function assertDay(day: number): void {
    if (!Number.isInteger(day) || day < 0) throw new RangeError('日序必須為非負整數');
}

/** 將武將的冷卻紀錄設為 today + 30；同一武將只保留較晚的結束日。回傳新陣列，不改輸入。 */
export function startPoolCooldown(cooldowns: readonly PoolCooldown[], uid: string, today: number): PoolCooldown[] {
    assertDay(today);
    const availableOnDay = today + POOL_COOLDOWN_DAYS;
    const others = cooldowns.filter(c => c.uid !== uid);
    const existing = cooldowns.find(c => c.uid === uid);
    const keep = existing && existing.availableOnDay > availableOnDay ? existing : { uid, availableOnDay };
    return [...others, keep];
}

/** 今日是否可再次出現在傭兵池（無冷卻紀錄或冷卻已結束）。 */
export function isAvailableForPool(uid: string, today: number, cooldowns: readonly PoolCooldown[]): boolean {
    assertDay(today);
    const entry = cooldowns.find(c => c.uid === uid);
    return !entry || today >= entry.availableOnDay;
}

/**
 * 每日結算：試用倒數已歸零（daysLeft 0）且仍為 Trial，視為到期未結義，離隊並開始冷卻。
 * 其餘狀態（仍在倒數、已結義、已離隊）不變。回傳新狀態，不改輸入、不寫存檔。
 */
export function settleTrialRollover(record: MercenaryRecord, today: number, cooldowns: readonly PoolCooldown[]): DepartureResult {
    assertDay(today);
    const result: DepartureResult = {
        record: { ...record },
        cooldowns: [...cooldowns],
        departed: false,
        events: [],
    };
    if (record.status !== 'Trial' || record.daysLeft > 0) return result;
    result.record = { ...record, status: 'Expired' };
    result.departed = true;
    result.cooldowns = startPoolCooldown(cooldowns, record.uid, today);
    result.events.push(
        { type: 'departed', uid: record.uid, reason: 'trial-expired' },
        { type: 'farewell-letter', uid: record.uid, textKey: FAREWELL_TEXT_KEY },
        { type: 'cooldown-started', uid: record.uid, availableOnDay: today + POOL_COOLDOWN_DAYS },
    );
    return result;
}

export interface UpkeepDepartureResult {
    cooldowns: PoolCooldown[];
    departed: boolean;
    /** 只含離隊相關事件（離隊、告別信、冷卻）；薪水本身的事件仍由 MercenaryUpkeep 回傳。 */
    events: DepartureEvent[];
}

/**
 * 薪水欠款到期離隊的接線（PM 裁定：欠薪離隊同樣發告別信並開始冷卻）。
 * 呼叫端把 settleUpkeepDay / repayUpkeep 的事件陣列傳入；沒有 departed 事件則不變。
 * 只看 upkeep-unpaid 原因，不改輸入、不寫存檔。
 */
export function settleUpkeepDeparture(
    upkeepEvents: readonly { type: string; uid: string; reason?: string }[],
    today: number,
    cooldowns: readonly PoolCooldown[],
): UpkeepDepartureResult {
    assertDay(today);
    const leaving = upkeepEvents.find(e => e.type === 'departed' && e.reason === 'upkeep-unpaid');
    if (!leaving) return { cooldowns: [...cooldowns], departed: false, events: [] };
    const uid = leaving.uid;
    return {
        cooldowns: startPoolCooldown(cooldowns, uid, today),
        departed: true,
        events: [
            { type: 'departed', uid, reason: 'upkeep-unpaid' },
            { type: 'farewell-letter', uid, textKey: FAREWELL_TEXT_KEY },
            { type: 'cooldown-started', uid, availableOnDay: today + POOL_COOLDOWN_DAYS },
        ],
    };
}

/** 結義成功後同樣開始冷卻；只負責冷卻，不改變傭兵狀態。 */
export function startCooldownAfterBond(uid: string, today: number, cooldowns: readonly PoolCooldown[]): PoolCooldown[] {
    return startPoolCooldown(cooldowns, uid, today);
}
