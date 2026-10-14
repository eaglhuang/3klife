// @spec-source → WBS v3 MERC-01（傭兵資料模型：Merc_UID/Bond/Days_Left/Status 與存檔，往返序列化測試通過）；傭兵系統規格書：試用轉永久
/**
 * MercenarySaveModel — 傭兵存檔包（試用狀態、薪水狀態、冷卻紀錄）的序列化與讀檔校正，純邏輯，不依賴 cc。
 *
 * - serialize：輸出可 JSON 化的副本，不改輸入。
 * - normalize：讀檔時校正資料；欄位型別錯、數值超出範圍或狀態未知的項目會被丟棄，不讓壞資料進入遊戲。
 *
 * 規格的 Illustration_Stage、Original_Owner 尚未定義欄位型別，本模組不收，等資料設計定案後再加。
 * Unity 對照：像 JsonUtility 讀檔後的 OnValidate，壞欄位直接丟棄而不是讓遊戲崩潰。
 */
import { MercenaryState, MercenaryStatus, TRIAL_DAYS } from './MercenaryBond';
import { AFFECTION_CAP } from './MercenaryAffection';
import { PoolCooldown } from './MercenaryDeparture';
import { UpkeepState, UpkeepStatus } from './MercenaryUpkeep';

export interface MercenarySaveBundle {
    mercenaries: MercenaryState[];
    upkeep: UpkeepState[];
    cooldowns: PoolCooldown[];
}

const MERC_STATUSES: readonly MercenaryStatus[] = ['Trial', 'Bonded', 'Expired'];
const UPKEEP_STATUSES: readonly UpkeepStatus[] = ['Active', 'Frozen', 'Departed'];

export function createEmptyMercenaryBundle(): MercenarySaveBundle {
    return { mercenaries: [], upkeep: [], cooldowns: [] };
}

/** 輸出副本，不改輸入。 */
export function serializeMercenaryBundle(bundle: Readonly<MercenarySaveBundle>): MercenarySaveBundle {
    return {
        mercenaries: bundle.mercenaries.map(m => ({ ...m })),
        upkeep: bundle.upkeep.map(u => ({ ...u })),
        cooldowns: bundle.cooldowns.map(c => ({ ...c })),
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

function isCount(value: unknown, max = Number.MAX_SAFE_INTEGER): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max;
}

function readMercenary(raw: unknown): MercenaryState | null {
    if (!isRecord(raw)) return null;
    const { uid, daysLeft, bond, status } = raw;
    if (!isNonEmptyString(uid) || !isCount(daysLeft, TRIAL_DAYS) || !isCount(bond)) return null;
    if (!MERC_STATUSES.includes(status as MercenaryStatus)) return null;
    const mercenary: MercenaryState = { uid, daysLeft, bond, status: status as MercenaryStatus };
    // 選填欄位壞掉只丟該欄，不丟整筆傭兵
    if (isNonEmptyString(raw.generalId)) mercenary.generalId = raw.generalId;
    if (isCount(raw.affection, AFFECTION_CAP)) mercenary.affection = raw.affection;
    return mercenary;
}

function readUpkeep(raw: unknown): UpkeepState | null {
    if (!isRecord(raw)) return null;
    const { uid, status, unpaidDays, frozenDaysLeft } = raw;
    if (!isNonEmptyString(uid) || !isCount(unpaidDays) || !isCount(frozenDaysLeft)) return null;
    if (!UPKEEP_STATUSES.includes(status as UpkeepStatus)) return null;
    // Active / Departed 不應該有凍結倒數；倒數非零只允許 Frozen
    if (status !== 'Frozen' && frozenDaysLeft !== 0) return null;
    return { uid, status: status as UpkeepStatus, unpaidDays, frozenDaysLeft };
}

function readCooldown(raw: unknown): PoolCooldown | null {
    if (!isRecord(raw)) return null;
    const { uid, availableOnDay } = raw;
    if (!isNonEmptyString(uid) || !isCount(availableOnDay)) return null;
    const cooldown: PoolCooldown = { uid, availableOnDay };
    if (isNonEmptyString(raw.generalId)) cooldown.generalId = raw.generalId;
    return cooldown;
}

function readList<T>(raw: unknown, reader: (item: unknown) => T | null): T[] {
    if (!Array.isArray(raw)) return [];
    const out: T[] = [];
    for (const item of raw) {
        const parsed = reader(item);
        if (parsed) out.push(parsed);
    }
    return out;
}

/** 讀檔校正：不合法的項目丟棄，整包不會因單一壞資料而失敗；非物件輸入回傳空包。 */
export function normalizeMercenaryBundle(raw: unknown): MercenarySaveBundle {
    if (!isRecord(raw)) return createEmptyMercenaryBundle();
    return {
        mercenaries: readList(raw.mercenaries, readMercenary),
        upkeep: readList(raw.upkeep, readUpkeep),
        cooldowns: readList(raw.cooldowns, readCooldown),
    };
}
