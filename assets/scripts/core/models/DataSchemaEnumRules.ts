// @spec-source → Data Schema文件（本機端與Server端）.md §2-2 本輪補充欄位約束（DS-07，PROG-2-0499）
/**
 * DataSchemaEnumRules — §2-2 補充欄位中可機械驗證的列舉與跨欄位規則（純邏輯，不依賴 cc）
 *
 * §2-2 共列 34 條。本檔只實作「能用列舉或跨欄位比對判斷」的規則；
 * 其餘條目（例如 #9 低風險派遣清單、#10 Sync_Hash_Link 回扣、#23 Graduation_Tags 只作推薦）
 * 需要業務判斷或資料來源，未納入，見卡片說明。
 *
 * 輸入為 Root Save 的 `Data` 區塊（Record<string, unknown>），缺欄位不報錯，
 * 與 GeneralMainSchema 相同：只驗證已存在的值，補資料由各子系統負責。
 *
 * Unity 對照：像 Editor 的 PropertyValidator，把「只能選 A/B」與「兩欄不能相同」寫成規則表。
 */

/** §2-2 #6：Child_Preview.Revelation_Level，與 GeneralMainSchema.REVELATION_LEVELS 同值 */
export const CHILD_REVELATION_LEVELS = ['HIDDEN', 'TENDENCY', 'RANGE', 'EXACT'] as const;

/** §2-2 #20：Bonding_Sessions[*].Breeding_Mode */
export const BREEDING_MODES = ['Standard', 'Peace_Lineage'] as const;

/** §2-2 #22：Nurture_Sessions[*].Mentoring_Mode_Log */
export const MENTORING_MODES = ['Support', 'Legendary_Mentoring'] as const;

/** §2-2 #21：Mentor_Pool[*].Role_Boundary 固定值 */
export const MENTOR_ROLE_BOUNDARY = 'TeachingOnly';

/** §2-2 #21：教官資料不得回寫的關係與血統欄位 */
export const MENTOR_FORBIDDEN_KEYS = ['Father_UID', 'Mother_UID', 'Father_ID', 'Mother_ID', 'Genes', 'Bloodline_ID', 'Conception_Rate'] as const;

/** §2-2 #26：Gacha_State.*.Pool_Positioning 正式只允許的兩個值 */
export const POOL_POSITIONINGS = ['Bloodline_Seed', 'Nurture_Depth'] as const;

/** §2-2 #26：不得回流到轉蛋定位的類別 */
export const POOL_POSITIONING_FORBIDDEN = ['Tiger_Tally', 'Spirit_Card', 'DP'] as const;

/** §2-2 #19：Tournament_Data.Season_History[*] 必備欄位 */
export const SEASON_HISTORY_REQUIRED_KEYS = ['Season_Name', 'Final_Rank', 'Final_Points', 'Best_Win_Streak', 'Snapshot_ID'] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
    return typeof value === 'string' && (list as readonly string[]).includes(value);
}

/** 取出 Data 區塊底下的物件值（集合以 UID 或 pool 名為 key 時用） */
function valuesOf(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (isPlainObject(value)) return Object.values(value);
    return [];
}

/** 陣列或單筆物件都視為清單（Child_Preview 規格上可以是單筆） */
function entriesOf(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (isPlainObject(value)) return [value];
    return [];
}

/** §2-2 #6：Child_Preview.Revelation_Level（Child_Preview 可為單筆物件或陣列） */
function checkChildRevelation(data: Record<string, unknown>): string[] {
    const errors: string[] = [];
    for (const preview of entriesOf(data.Child_Preview)) {
        if (!isPlainObject(preview) || preview.Revelation_Level === undefined) continue;
        if (!isOneOf(CHILD_REVELATION_LEVELS, preview.Revelation_Level)) {
            errors.push(`Child_Preview.Revelation_Level: 必須是 ${CHILD_REVELATION_LEVELS.join('/')} 之一`);
        }
    }
    return errors;
}

/** §2-2 #20：Bonding_Sessions[*].Breeding_Mode */
function checkBreedingMode(data: Record<string, unknown>): string[] {
    const errors: string[] = [];
    for (const session of valuesOf(data.Bonding_Sessions)) {
        if (!isPlainObject(session) || session.Breeding_Mode === undefined) continue;
        if (!isOneOf(BREEDING_MODES, session.Breeding_Mode)) {
            errors.push(`Bonding_Sessions.Breeding_Mode: 必須是 ${BREEDING_MODES.join('/')} 之一`);
        }
    }
    return errors;
}

/** §2-2 #21：Mentor_Pool[*] 的 Role_Boundary 固定為 TeachingOnly，且不得帶入血緣相關欄位 */
function checkMentorBoundary(data: Record<string, unknown>): string[] {
    const errors: string[] = [];
    for (const mentor of valuesOf(data.Mentor_Pool)) {
        if (!isPlainObject(mentor)) continue;
        if (mentor.Role_Boundary !== undefined && mentor.Role_Boundary !== MENTOR_ROLE_BOUNDARY) {
            errors.push(`Mentor_Pool.Role_Boundary: 必須固定為 ${MENTOR_ROLE_BOUNDARY}`);
        }
        for (const key of MENTOR_FORBIDDEN_KEYS) {
            if (mentor[key] !== undefined) {
                errors.push(`Mentor_Pool.${key}: 教官資料不得回寫血緣與受孕欄位`);
            }
        }
    }
    return errors;
}

/** §2-2 #22：Nurture_Sessions[*].Mentoring_Mode_Log 只能是 Support 或 Legendary_Mentoring */
function checkMentoringMode(data: Record<string, unknown>): string[] {
    const errors: string[] = [];
    for (const session of valuesOf(data.Nurture_Sessions)) {
        if (!isPlainObject(session) || session.Mentoring_Mode_Log === undefined) continue;
        if (!isOneOf(MENTORING_MODES, session.Mentoring_Mode_Log)) {
            errors.push(`Nurture_Sessions.Mentoring_Mode_Log: 必須是 ${MENTORING_MODES.join('/')} 之一`);
        }
    }
    return errors;
}

/** §2-2 #26：Gacha_State.*.Pool_Positioning 只允許 Bloodline_Seed / Nurture_Depth */
function checkPoolPositioning(data: Record<string, unknown>): string[] {
    const errors: string[] = [];
    for (const pool of valuesOf(data.Gacha_State)) {
        if (!isPlainObject(pool) || pool.Pool_Positioning === undefined) continue;
        if (!isOneOf(POOL_POSITIONINGS, pool.Pool_Positioning)) {
            const hint = POOL_POSITIONING_FORBIDDEN.includes(pool.Pool_Positioning as (typeof POOL_POSITIONING_FORBIDDEN)[number])
                ? '（不得回流虎符、英靈卡或 DP 類別）'
                : '';
            errors.push(`Gacha_State.Pool_Positioning: 必須是 ${POOL_POSITIONINGS.join('/')} 之一${hint}`);
        }
    }
    return errors;
}

/** §2-2 #33：Sortie_Loadout 的 Commander / Strategist / Deputy 三個 UID 彼此不得重覆（未填的位置不比對） */
function checkSortieDistinct(data: Record<string, unknown>): string[] {
    const loadout = data.Sortie_Loadout;
    if (!isPlainObject(loadout)) return [];
    const slots: readonly string[] = ['Commander_UID', 'Strategist_UID', 'Deputy_UID'];
    const filled = slots
        .map((slot) => ({ slot, uid: loadout[slot] }))
        .filter((entry): entry is { slot: string; uid: string } => typeof entry.uid === 'string' && entry.uid.length > 0);
    const errors: string[] = [];
    for (let i = 0; i < filled.length; i += 1) {
        for (let j = i + 1; j < filled.length; j += 1) {
            if (filled[i].uid === filled[j].uid) {
                errors.push(`Sortie_Loadout: ${filled[i].slot} 與 ${filled[j].slot} 不得重覆（${filled[i].uid}）`);
            }
        }
    }
    return errors;
}

/** §2-2 #12：Battle_State.Scene_Preset_ID 必須對齊 Scene_Gambit_State.Tile_Preset_ID */
function checkScenePresetAlignment(data: Record<string, unknown>): string[] {
    const battle = data.Battle_State;
    const gambit = data.Scene_Gambit_State;
    if (!isPlainObject(battle) || !isPlainObject(gambit)) return [];
    if (battle.Scene_Preset_ID === undefined || gambit.Tile_Preset_ID === undefined) return [];
    if (battle.Scene_Preset_ID !== gambit.Tile_Preset_ID) {
        return [`Battle_State.Scene_Preset_ID: 必須與 Scene_Gambit_State.Tile_Preset_ID 一致`];
    }
    return [];
}

/** §2-2 #7：General_Journal.Journal_Entries[*].Source_Action_Seq_Range 必須是 [起, 迄]，起不得大於迄 */
function checkActionSeqRange(data: Record<string, unknown>): string[] {
    const journal = data.General_Journal;
    if (!isPlainObject(journal)) return [];
    const errors: string[] = [];
    for (const entry of valuesOf(journal.Journal_Entries)) {
        if (!isPlainObject(entry) || entry.Source_Action_Seq_Range === undefined) continue;
        const range = entry.Source_Action_Seq_Range;
        const valid = Array.isArray(range) && range.length === 2
            && range.every((n) => Number.isInteger(n) && n >= 0)
            && (range[0] as number) <= (range[1] as number);
        if (!valid) {
            errors.push('General_Journal.Journal_Entries.Source_Action_Seq_Range: 必須是非負整數的 [起, 迄]，且起不大於迄');
        }
    }
    return errors;
}

/** §2-2 #19：Tournament_Data.Season_History[*] 必備欄位齊全 */
function checkSeasonHistory(data: Record<string, unknown>): string[] {
    const tournament = data.Tournament_Data;
    if (!isPlainObject(tournament)) return [];
    const errors: string[] = [];
    for (const season of valuesOf(tournament.Season_History)) {
        if (!isPlainObject(season)) {
            errors.push('Tournament_Data.Season_History: 每筆必須是物件');
            continue;
        }
        const missing = SEASON_HISTORY_REQUIRED_KEYS.filter((key) => season[key] === undefined);
        if (missing.length > 0) errors.push(`Tournament_Data.Season_History: 缺少 ${missing.join('/')}`);
    }
    return errors;
}

/** §2-2 #32：Generals[*].Equipped_Spirit_UID 若存在，必須對回 Spirit_Card_Collection 的 Spirit_ID */
function checkEquippedSpiritResolves(data: Record<string, unknown>): string[] {
    const generals = data.Generals;
    if (!isPlainObject(generals)) return [];
    const collectionIds = new Set(
        valuesOf(data.Spirit_Card_Collection)
            .filter(isPlainObject)
            .map((card) => card.Spirit_ID)
            .filter((id): id is string => typeof id === 'string'),
    );
    const errors: string[] = [];
    for (const [uid, general] of Object.entries(generals)) {
        if (!isPlainObject(general) || general.Equipped_Spirit_UID === undefined) continue;
        if (!collectionIds.has(general.Equipped_Spirit_UID as string)) {
            errors.push(`Generals.${uid}.Equipped_Spirit_UID: 無法對回 Spirit_Card_Collection.Spirit_ID`);
        }
    }
    return errors;
}

/**
 * 執行全部 §2-2 規則，回傳錯誤訊息；空陣列代表通過。
 * 每條訊息以「路徑: 原因」開頭，方便對應到 JSON。
 */
export function validateSection22Rules(data: Record<string, unknown>): string[] {
    return [
        ...checkChildRevelation(data),
        ...checkBreedingMode(data),
        ...checkMentorBoundary(data),
        ...checkMentoringMode(data),
        ...checkPoolPositioning(data),
        ...checkSortieDistinct(data),
        ...checkScenePresetAlignment(data),
        ...checkActionSeqRange(data),
        ...checkSeasonHistory(data),
        ...checkEquippedSpiritResolves(data),
    ];
}
