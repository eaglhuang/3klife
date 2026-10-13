// @spec-source → 可結緣女性來源系統.md §I Data Schema（FemaleSource）、§E #1~#2 管道、§F 品質分佈（FEM-01，WBS）
/**
 * FemaleSource — 女性武將的來源與品質欄位（純邏輯，不依賴 cc）
 *
 * 每位女性武將記錄：從哪個管道來（Source_Type）、品質（Quality_Grade）、
 * 受孕率修正（Base_Conception_Mod，FEM-02 之後才會填入非 1 的值）、取得季度、送禮好感（僅戰俘／傭兵用）。
 * 存檔以武將 uid 為鍵；讀回時不合格的條目直接丟棄，不會讓壞資料拖垮存檔。
 *
 * Unity 對照：像 ScriptableObject 的來源欄位，建立時寫入，讀檔時用 OnValidate 式的清理。
 */

export type FemaleSourceType = 'GACHA' | 'MERCENARY' | 'CAPTIVE' | 'DUNGEON' | 'OFFSPRING';
export type FemaleQualityGrade = 'SSR' | 'SR' | 'R' | 'N';

export interface FemaleSource {
    Source_Type: FemaleSourceType;
    Quality_Grade: FemaleQualityGrade;
    /** 受孕率修正倍率；FEM-01 預設 1.0，FEM-02 再依來源與母齡填入 */
    Base_Conception_Mod: number;
    /** 取得時的遊戲季度（≥ 0） */
    Acquired_Season: number;
    /** 送禮好感 0~100；只有戰俘與傭兵會用到，其餘為 0 */
    Gift_Affinity: number;
}

export const FEMALE_SOURCE_TYPES: readonly FemaleSourceType[] = Object.freeze(['GACHA', 'MERCENARY', 'CAPTIVE', 'DUNGEON', 'OFFSPRING']);
export const FEMALE_QUALITY_GRADES: readonly FemaleQualityGrade[] = Object.freeze(['SSR', 'SR', 'R', 'N']);

/** 建立來源紀錄；好感度只對戰俘與傭兵有意義，其他來源固定為 0 */
export function createFemaleSource(sourceType: FemaleSourceType, quality: FemaleQualityGrade, season: number): FemaleSource {
    return {
        Source_Type: sourceType,
        Quality_Grade: quality,
        Base_Conception_Mod: 1,
        Acquired_Season: normalizeSeason(season),
        Gift_Affinity: 0,
    };
}

function normalizeSeason(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function isSourceType(value: unknown): value is FemaleSourceType {
    return typeof value === 'string' && (FEMALE_SOURCE_TYPES as readonly string[]).includes(value);
}

function isQualityGrade(value: unknown): value is FemaleQualityGrade {
    return typeof value === 'string' && (FEMALE_QUALITY_GRADES as readonly string[]).includes(value);
}

/** 讀回單筆來源；型別或來源／品質不合法回傳 null（整筆丟棄） */
export function normalizeFemaleSource(raw: unknown): FemaleSource | null {
    if (!raw || typeof raw !== 'object') return null;
    const entry = raw as Partial<Record<keyof FemaleSource, unknown>>;
    if (!isSourceType(entry.Source_Type) || !isQualityGrade(entry.Quality_Grade)) return null;
    const mod = typeof entry.Base_Conception_Mod === 'number' && Number.isFinite(entry.Base_Conception_Mod) && entry.Base_Conception_Mod > 0
        ? entry.Base_Conception_Mod
        : 1;
    const affinity = typeof entry.Gift_Affinity === 'number' && Number.isFinite(entry.Gift_Affinity)
        ? Math.min(100, Math.max(0, Math.floor(entry.Gift_Affinity)))
        : 0;
    return {
        Source_Type: entry.Source_Type,
        Quality_Grade: entry.Quality_Grade,
        Base_Conception_Mod: mod,
        Acquired_Season: normalizeSeason(entry.Acquired_Season),
        Gift_Affinity: affinity,
    };
}

/** 來源表（uid → 來源）：非物件視為沒有紀錄；條目不合格就丟棄 */
export function normalizeFemaleSourcesMap(value: unknown): Record<string, FemaleSource> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const out: Record<string, FemaleSource> = {};
    for (const [uid, raw] of Object.entries(value as Record<string, unknown>)) {
        if (uid.length === 0) continue;
        const source = normalizeFemaleSource(raw);
        if (source) out[uid] = source;
    }
    return out;
}
