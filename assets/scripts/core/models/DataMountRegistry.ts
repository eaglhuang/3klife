// @spec-source → 武將資料結構列舉驗證與掛載協議規格書 (doc_spec_0319) §1~§4（DS-07、DS-04，PROG-2-1945）
/**
 * DataMountRegistry — Data.* 25 條掛載點補齊，與 doc_spec_0319 新增的列舉／跨欄位驗證（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 25 條掛載點缺漏時以空物件補齊，既有值不動。
 * - #5 Rival_Nations[*].Coalition_State：HEGEMON / FORCED_ALLIED / NEUTRAL / HOSTILE。
 * - #13 Battle_State.Reserved_Tally_Bands：只能是 R / SR / SSR / UR 字串陣列（禁止存完整虎符物件）。
 * - #34 Officer_Promotion.Rank_Track：CIVIL / MILITARY / SPECIAL。
 * - Sortie_Loadout 的 Main / Deputy / Vanguard 三個 UID 不得重複。
 * - #10 Offline_Battle_Snapshots[*].Sync_Hash_Link 必須回扣 Action_Records 的 key，或是 16 位以上十六進位 Hash。
 * - 非侵入：欄位不存在不報錯；存在但違規即 isValid=false 並附欄位路徑。
 *
 * 既有的 §2-2 規則（#6/#20/#21/#22/#26/#12/#32 等）沿用 DataSchemaEnumRules.validateSection22Rules，本檔一併彙整。
 * Unity 對照：像存檔載入後的 Migration + Validator，一次回報所有違規。
 */
import { validateSection22Rules } from './DataSchemaEnumRules';

export const DATA_MOUNT_KEYS = [
    'Generals', 'Lobby_Hub', 'Rival_Nations', 'Child_Preview', 'General_Journal',
    'Battle_State', 'Scene_Gambit_State', 'Player_Economy', 'Tournament_Data', 'Bonding_Sessions',
    'Mentor_Pool', 'Nurture_Sessions', 'Stage_Chain_Progress', 'Officer_Promotion', 'Spirit_Card_Inventory',
    'Tiger_Tally_Inventory', 'Mentor_Support_Inventory', 'Mentor_Shard_Bank', 'Longevity_Pill_Usage', 'Gene_Awakening_Log',
    'Gacha_State', 'City_Population_Registry', 'Diplomacy_Truce_Records', 'Family_Ancestral_Hall', 'Action_Records',
] as const;

export const COALITION_STATES = ['HEGEMON', 'FORCED_ALLIED', 'NEUTRAL', 'HOSTILE'] as const;
export const RESERVED_TALLY_BANDS = ['R', 'SR', 'SSR', 'UR'] as const;
export const RANK_TRACKS = ['CIVIL', 'MILITARY', 'SPECIAL'] as const;
const SYNC_HASH_PATTERN = /^[0-9a-f]{16,}$/i;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf(list: readonly string[], value: unknown): boolean {
    return typeof value === 'string' && list.includes(value);
}

function valuesOf(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (isPlainObject(value)) return Object.values(value);
    return [];
}

/** 補齊缺漏掛載點（回傳新物件；補上的掛載點清單供遷移紀錄）。 */
export function ensureDataMounts(data: Record<string, unknown>): { data: Record<string, unknown>; added: string[] } {
    const next = { ...data };
    const added: string[] = [];
    for (const key of DATA_MOUNT_KEYS) {
        if (next[key] === undefined) {
            next[key] = {};
            added.push(key);
        }
    }
    return { data: next, added };
}

function checkCoalitionState(data: Record<string, unknown>): string[] {
    const errors: string[] = [];
    for (const nation of valuesOf(data.Rival_Nations)) {
        if (!isPlainObject(nation) || nation.Coalition_State === undefined) continue;
        if (!isOneOf(COALITION_STATES, nation.Coalition_State)) {
            errors.push(`Rival_Nations[*].Coalition_State: 必須是 ${COALITION_STATES.join('/')} 之一`);
        }
    }
    return errors;
}

function checkReservedTallyBands(data: Record<string, unknown>): string[] {
    const battle = data.Battle_State;
    if (!isPlainObject(battle) || battle.Reserved_Tally_Bands === undefined) return [];
    const bands = battle.Reserved_Tally_Bands;
    if (!Array.isArray(bands) || bands.some((b) => !isOneOf(RESERVED_TALLY_BANDS, b))) {
        return [`Battle_State.Reserved_Tally_Bands: 只能是 ${RESERVED_TALLY_BANDS.join('/')} 字串陣列`];
    }
    return [];
}

function checkRankTrack(data: Record<string, unknown>): string[] {
    const promo = data.Officer_Promotion;
    if (!isPlainObject(promo) || promo.Rank_Track === undefined) return [];
    return isOneOf(RANK_TRACKS, promo.Rank_Track) ? [] : [`Officer_Promotion.Rank_Track: 必須是 ${RANK_TRACKS.join('/')} 之一`];
}

function checkSortieMainDeputyVanguard(data: Record<string, unknown>): string[] {
    const loadout = data.Sortie_Loadout;
    if (!isPlainObject(loadout)) return [];
    const slots = ['Main_General_UID', 'Deputy_General_UID', 'Vanguard_General_UID'];
    const seen = new Map<string, string>();
    const errors: string[] = [];
    for (const slot of slots) {
        const uid = loadout[slot];
        if (typeof uid !== 'string' || uid.length === 0) continue;
        const prev = seen.get(uid);
        if (prev) errors.push(`Sortie_Loadout: ${prev} 與 ${slot} 不得重覆（${uid}）`);
        else seen.set(uid, slot);
    }
    return errors;
}

function checkSyncHashLink(data: Record<string, unknown>): string[] {
    const journal = data.General_Journal;
    if (!isPlainObject(journal)) return [];
    const records = isPlainObject(data.Action_Records) ? data.Action_Records : {};
    const errors: string[] = [];
    for (const snap of valuesOf(journal.Offline_Battle_Snapshots)) {
        if (!isPlainObject(snap) || snap.Sync_Hash_Link === undefined) continue;
        const link = snap.Sync_Hash_Link;
        const ok = typeof link === 'string' && (Object.prototype.hasOwnProperty.call(records, link) || SYNC_HASH_PATTERN.test(link));
        if (!ok) errors.push('General_Journal.Offline_Battle_Snapshots[*].Sync_Hash_Link: 必須回扣 Action_Records 序號或有效 Hash');
    }
    return errors;
}

export interface DataSchemaVerdict {
    isValid: boolean;
    errors: string[];
}

/** doc_spec_0319 完整驗證：既有 §2-2 規則 + 本規格新增規則。 */
export function validateRootSaveData(data: Record<string, unknown>): DataSchemaVerdict {
    const errors = [
        ...validateSection22Rules(data),
        ...checkCoalitionState(data),
        ...checkReservedTallyBands(data),
        ...checkRankTrack(data),
        ...checkSortieMainDeputyVanguard(data),
        ...checkSyncHashLink(data),
    ];
    return { isValid: errors.length === 0, errors };
}
