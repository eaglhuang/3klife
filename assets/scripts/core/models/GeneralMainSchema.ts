// @spec-source → Data Schema文件（本機端與Server端）.md §二.1 武將主結構、§2-2 欄位約束 27–32（DS-02，PROG-2-0497）
/**
 * GeneralMainSchema — 武將主結構（規格用語）的欄位契約與列舉驗證（純邏輯，不依賴 cc）
 *
 * 規格主結構共 22 個頂層欄位。目前 generals.json 採用舊的 camelCase 扁平欄位，
 * 其中 11 個規格欄位尚無資料（Phase、Talent_Stats…），3 個形狀不同（Genes、Ancestors_JSON、
 * Profile_Presentation）。本檔只定義「欄位存在時」必須符合的規格形狀與列舉，
 * 不替缺資料的武將補值：補值來源（Talent 三層數值、畢業戰力快照、父母 ID）需 PM 另行裁定。
 *
 * Unity 對照：像 ScriptableObject 的 OnValidate 規則表，只驗證已填的欄位，缺欄位不報錯。
 */

/** 規格 §2-2 #28：人物頁與培育頁共用的揭露階段 */
export const REVELATION_LEVELS = ['HIDDEN', 'TENDENCY', 'RANGE', 'EXACT'] as const;
export type RevelationLevel = (typeof REVELATION_LEVELS)[number];

/** 規格 §2-2 #2：女性名將池內的定位標籤 */
export const FEMALE_ROLE_TYPES = ['COMBAT', 'SUPPORT'] as const;
export type FemaleRoleType = (typeof FEMALE_ROLE_TYPES)[number];

/** 規格 §2-2 #31：人物頁預設分頁（本地化顯示：將 / 屬 / 命 / 技 / 寶 / 兵） */
export const PROFILE_DEFAULT_TABS = ['Overview', 'Stats', 'Bloodline', 'Tactics', 'Equip', 'Aptitude'] as const;
export type ProfileDefaultTab = (typeof PROFILE_DEFAULT_TABS)[number];

/** 規格 §2-2 #31a：命頁底部故事條抽拉狀態 */
export const BLOODLINE_STORY_DOCK_STATES = ['COLLAPSED', 'HALF', 'EXPANDED'] as const;
export type BloodlineStoryDockState = (typeof BLOODLINE_STORY_DOCK_STATES)[number];

/** 規格 §2-2 #30：故事條六格語意槽位，不得改成流水號 key */
export const STORY_STRIP_SLOTS = ['origin', 'faction', 'role', 'awakening', 'bloodline', 'future'] as const;

/** 六色屬性（規格 Stats / Talent_Stats / Prowess_Stats 共用鍵） */
export const SIX_STAT_KEYS = ['STR', 'INT', 'LEA', 'POL', 'CHA', 'LUK'] as const;

/** 規格 §二.1 武將主結構的 22 個頂層欄位，供覆蓋率報告與文件對照 */
export const GENERAL_MAIN_SPEC_FIELDS = [
    'Template_ID',
    'Bloodline_ID',
    'Phase',
    'Status',
    'Role',
    'Has_Retired_Before',
    'Female_Role_Type',
    'Stats',
    'Talent_Stats',
    'Prowess_Stats',
    'Personality',
    'Loyalty',
    'Recent_Log',
    'Current_Suitability',
    'Vitality',
    'Vitality_Max',
    'Genes',
    'Father_ID',
    'Mother_ID',
    'Core_Tags',
    'Ancestors_JSON',
    'Profile_Presentation',
] as const;

export type GeneralMainSpecField = (typeof GENERAL_MAIN_SPEC_FIELDS)[number];

/** 規格形狀的武將主結構（所有欄位皆可缺，缺欄位不驗證） */
export type GeneralMainRecord = Partial<Record<GeneralMainSpecField, unknown>>;

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
    return typeof value === 'string' && (list as readonly string[]).includes(value);
}

/** Talent_Stats：每個六色屬性需有 Base / Current / Max_Potential 與合法的 Revelation_Level */
function validateTalentStats(value: unknown): string[] {
    if (!isPlainObject(value)) return ['Talent_Stats: 必須是物件'];
    const errors: string[] = [];
    for (const key of SIX_STAT_KEYS) {
        const entry = value[key];
        if (!isPlainObject(entry)) {
            errors.push(`Talent_Stats.${key}: 缺少屬性物件`);
            continue;
        }
        const { Base, Current, Max_Potential, Revelation_Level } = entry;
        if (!isFiniteNumber(Base)) errors.push(`Talent_Stats.${key}.Base: 不是有限數字`);
        if (!isFiniteNumber(Current)) errors.push(`Talent_Stats.${key}.Current: 不是有限數字`);
        if (!isFiniteNumber(Max_Potential)) errors.push(`Talent_Stats.${key}.Max_Potential: 不是有限數字`);
        if (isFiniteNumber(Base) && isFiniteNumber(Max_Potential) && Base > Max_Potential) {
            errors.push(`Talent_Stats.${key}: Base 超過 Max_Potential`);
        }
        if (!isOneOf(REVELATION_LEVELS, Revelation_Level)) {
            errors.push(`Talent_Stats.${key}.Revelation_Level: 必須是 ${REVELATION_LEVELS.join('/')} 之一`);
        }
    }
    return errors;
}

/** Prowess_Stats：六色戰力數字 + Overall_Rank；Source_Session_ID 可為 null（尚無畢業快照，不得回填） */
function validateProwessStats(value: unknown): string[] {
    if (!isPlainObject(value)) return ['Prowess_Stats: 必須是物件'];
    const errors: string[] = [];
    for (const key of SIX_STAT_KEYS) {
        if (!isFiniteNumber(value[key])) errors.push(`Prowess_Stats.${key}: 不是有限數字`);
    }
    if (typeof value.Overall_Rank !== 'string' || value.Overall_Rank.trim().length === 0) {
        errors.push('Prowess_Stats.Overall_Rank: 缺少評級');
    }
    const sessionId = value.Source_Session_ID;
    if (sessionId !== null && sessionId !== undefined && typeof sessionId !== 'string') {
        errors.push('Prowess_Stats.Source_Session_ID: 必須是字串或 null');
    }
    return errors;
}

/** Profile_Presentation：分頁、故事條狀態與六格故事條（key 必須是六個語意槽位） */
function validateProfilePresentation(value: unknown): string[] {
    if (!isPlainObject(value)) return ['Profile_Presentation: 必須是物件'];
    const errors: string[] = [];
    if (!isOneOf(PROFILE_DEFAULT_TABS, value.Default_Tab)) {
        errors.push(`Profile_Presentation.Default_Tab: 必須是 ${PROFILE_DEFAULT_TABS.join('/')} 之一`);
    }
    if (!isOneOf(BLOODLINE_STORY_DOCK_STATES, value.Bloodline_StoryDock_State)) {
        errors.push(`Profile_Presentation.Bloodline_StoryDock_State: 必須是 ${BLOODLINE_STORY_DOCK_STATES.join('/')} 之一`);
    }
    const cells = value.Story_Strip_Cells;
    if (!isPlainObject(cells)) {
        errors.push('Profile_Presentation.Story_Strip_Cells: 必須是物件');
    } else {
        const keys = Object.keys(cells);
        const missing = STORY_STRIP_SLOTS.filter((slot) => !keys.includes(slot));
        const extra = keys.filter((key) => !(STORY_STRIP_SLOTS as readonly string[]).includes(key));
        if (missing.length > 0) errors.push(`Profile_Presentation.Story_Strip_Cells: 缺少槽位 ${missing.join('/')}`);
        if (extra.length > 0) errors.push(`Profile_Presentation.Story_Strip_Cells: 不得有槽位外的 key ${extra.join('/')}`);
    }
    return errors;
}

/**
 * 驗證規格形狀的武將主結構中「已存在」的欄位；回傳錯誤訊息，空陣列代表通過。
 * 訊息以「欄位名: 原因」開頭，與 GeneralSchema 的風格一致。
 */
export function validateGeneralMainFields(record: GeneralMainRecord): string[] {
    const errors: string[] = [];

    if (record.Female_Role_Type !== undefined && !isOneOf(FEMALE_ROLE_TYPES, record.Female_Role_Type)) {
        errors.push(`Female_Role_Type: 必須是 ${FEMALE_ROLE_TYPES.join('/')} 之一`);
    }
    if (record.Has_Retired_Before !== undefined && typeof record.Has_Retired_Before !== 'boolean') {
        errors.push('Has_Retired_Before: 必須是布林值');
    }
    if (record.Father_ID !== undefined && record.Father_ID !== null && typeof record.Father_ID !== 'string') {
        errors.push('Father_ID: 必須是字串或 null');
    }
    if (record.Mother_ID !== undefined && record.Mother_ID !== null && typeof record.Mother_ID !== 'string') {
        errors.push('Mother_ID: 必須是字串或 null');
    }
    if (record.Talent_Stats !== undefined) errors.push(...validateTalentStats(record.Talent_Stats));
    if (record.Prowess_Stats !== undefined) errors.push(...validateProwessStats(record.Prowess_Stats));
    if (record.Profile_Presentation !== undefined) {
        errors.push(...validateProfilePresentation(record.Profile_Presentation));
    }

    return errors;
}

/** 每個規格欄位在整批武將中出現的筆數，供文件與資料補齊進度對照 */
export function countSpecFieldCoverage(records: readonly GeneralMainRecord[]): Record<GeneralMainSpecField, number> {
    const counts = Object.fromEntries(GENERAL_MAIN_SPEC_FIELDS.map((field) => [field, 0])) as Record<GeneralMainSpecField, number>;
    for (const record of records) {
        for (const field of GENERAL_MAIN_SPEC_FIELDS) {
            if (record[field] !== undefined) counts[field] += 1;
        }
    }
    return counts;
}

/**
 * 已知差異：generals.json 目前保留的舊形狀與規格寫法不同。PM 裁定（2026-10-20）：先保留現有形狀，
 * 不改 235 筆資料；在此登記差異與 adapter 對照，待使用者裁決後再統一。
 * 讀取端應經 adapter 轉成規格形狀，不直接假設資料已是規格寫法。
 */
export interface GeneralMainKnownDifference {
    /** 規格欄位名 */
    specField: GeneralMainSpecField;
    /** generals.json 目前的欄位名 */
    legacyKey: string;
    /** 對照說明（adapter 要做的轉換） */
    adapterNote: string;
    /** 待裁決事項（任務卡 PROG-2-0464 與待辦檔） */
    pendingDecision: string;
}

export const GENERAL_MAIN_KNOWN_DIFFERENCES: readonly GeneralMainKnownDifference[] = [
    {
        specField: 'Genes',
        legacyKey: 'genes',
        adapterNote: '舊 {id, displayName, type(中文), level, description} → 規格 {ID=id, Level=level, Type(六色), Is_Locked, Discovery_Level}；Type 需中文→六色對照表，缺 type 者需補值',
        pendingDecision: '六色對照表、ID 命名規則、5 筆無 type 的補法（PROG-2-0464）',
    },
    {
        specField: 'Ancestors_JSON',
        legacyKey: 'ancestor_chain',
        adapterNote: '舊 ancestor_chain 為 VIRT_* UID 清單，ancestorsSummary 為摘要字串 → 規格三代 14 人樹；需以 PersonRegistry 依 UID 展開人物物件',
        pendingDecision: 'UID 是否展開成人物物件，或保留 UID 並標示（BLT-02 VIRT_，PROG-2-0464）',
    },
    {
        specField: 'Profile_Presentation',
        legacyKey: 'storyStripCells',
        adapterNote: '舊 storyStripCells 為 [{slot, text}] 陣列 → 規格 Story_Strip_Cells keyed map；Default_Tab、Bloodline_StoryDock_State 舊資料無，adapter 需給預設值',
        pendingDecision: 'Default_Tab 與 StoryDock 預設值；UI mapper 是否同步（PROG-2-0464）',
    },
];
