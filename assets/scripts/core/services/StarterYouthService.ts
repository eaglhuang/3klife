// @spec-source → 使用者裁決 2026-11-20（PROG-2-9194：開局送一位 14 歲投靠少年名將）；子嗣五歲抓周揭曉與及冠入學直通學府代際傳承規格書.md
/**
 * StarterYouthService — 新帳號開局「14 歲投靠少年名將」（純邏輯，不依賴 cc）
 *
 * - 少年名將是投靠的少年，不是自家子嗣：沒有父母欄位，不進血統樹；id 與成年版相同（轉蛋去重靠 id，所以同名成年版會被當重複卡）。
 * - 數值取該名將的成年史實資料 × 年齡係數；係數表在 data/starter-youth-config.json（暫定值，可被日後歷練系統共用）。
 * - 第 1 年年末滿 15 歲才可入學；學府結業後由 promoteYouthToAdult 恢復成年完整值並加上訓練增量。
 */
import type { GeneralConfig, GeneralStatsConfig } from '../models/GeneralUnit';
import type { AptitudeGrade } from '../systems/BattleAptitude';

export interface YouthAgeRatio {
    age: number;
    ratio: number;
}

/** 職業傾向：對應不同玩法（武將、領袖、文官、教官） */
export type YouthCareer = 'general' | 'leader' | 'civil' | 'mentor';
export const YOUTH_CAREERS: readonly YouthCareer[] = ['general', 'leader', 'civil', 'mentor'];

/** 候選少年名將：只填成年版武將 id 與職業傾向，換人或加人只改 JSON */
export interface YouthCandidate {
    id: string;
    career: YouthCareer;
}

export interface StarterYouthConfig {
    /** 開局年齡 */
    age: number;
    /** 可入學年齡 */
    enrollAge: number;
    /** 開場挑選名單（先放三位知名人物；開場畫面最多列出 5 位） */
    candidates: YouthCandidate[];
    /** 沒有挑選（舊流程、測試）時用的預設人選 */
    defaultPickId: string;
    /** 年齡係數表（暫定）：少年版數值 = 成年值 x 係數，區間線性內插 */
    ageRatios: YouthAgeRatio[];
    lukRatio: number;
    hpRatio: number;
    epRatio: number;
    /** 兵種／地形／天氣適性各降幾階（職業屬性，暫定） */
    aptitudeGradeDrop: number;
}

/** 少年版標記：存在名冊上，結業時用來辨識與還原 */
export interface YouthMark {
    /** 可入學年齡 */
    enrollAge: number;
    /** 成年版原年齡（結業後還原） */
    adultAge: number;
}

export type YouthGeneral = GeneralConfig & { youth?: YouthMark };

export const DEFAULT_STARTER_YOUTH_CONFIG: StarterYouthConfig = {
    age: 14,
    enrollAge: 15,
    candidates: [
        { id: 'zhao-yun', career: 'general' },
        { id: 'guan-yu', career: 'general' },
        { id: 'zhuge-liang', career: 'civil' },
    ],
    defaultPickId: 'zhao-yun',
    ageRatios: [
        { age: 10, ratio: 0.55 },
        { age: 14, ratio: 0.75 },
        { age: 15, ratio: 0.8 },
        { age: 20, ratio: 0.95 },
    ],
    lukRatio: 0.9,
    hpRatio: 0.75,
    epRatio: 0.85,
    aptitudeGradeDrop: 1,
};

export const STARTER_YOUTH_CONFIG_JSON = 'data/starter-youth-config';

let activeConfig: StarterYouthConfig = DEFAULT_STARTER_YOUTH_CONFIG;

function num(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** 套用 starter-youth-config.json（缺欄位退回內建預設）。 */
export function configureStarterYouth(raw: Partial<StarterYouthConfig> | null | undefined): void {
    if (!raw || typeof raw !== 'object') {
        activeConfig = DEFAULT_STARTER_YOUTH_CONFIG;
        return;
    }
    const d = DEFAULT_STARTER_YOUTH_CONFIG;
    const ratios = Array.isArray(raw.ageRatios)
        ? raw.ageRatios.filter((r) => r && Number.isFinite(r.age) && Number.isFinite(r.ratio)).map((r) => ({ age: r.age, ratio: r.ratio }))
        : [];
    const candidates: YouthCandidate[] = Array.isArray(raw.candidates)
        ? raw.candidates
            .filter((c) => c && typeof c.id === 'string' && c.id)
            .map((c) => ({ id: c.id, career: YOUTH_CAREERS.includes(c.career) ? c.career : 'general' as YouthCareer }))
        : [];
    const finalCandidates = candidates.length > 0 ? candidates : d.candidates;
    activeConfig = {
        age: num(raw.age, d.age),
        enrollAge: num(raw.enrollAge, d.enrollAge),
        candidates: finalCandidates,
        defaultPickId: typeof raw.defaultPickId === 'string' && finalCandidates.some((c) => c.id === raw.defaultPickId) ? raw.defaultPickId : finalCandidates[0].id,
        ageRatios: ratios.length > 0 ? ratios : d.ageRatios,
        lukRatio: num(raw.lukRatio, d.lukRatio),
        hpRatio: num(raw.hpRatio, d.hpRatio),
        epRatio: num(raw.epRatio, d.epRatio),
        aptitudeGradeDrop: Math.max(0, Math.floor(num(raw.aptitudeGradeDrop, d.aptitudeGradeDrop))),
    };
}

/** 目前生效的設定（JSON 載入後即為 JSON 值）。 */
export function getStarterYouthConfig(): StarterYouthConfig {
    return activeConfig;
}

/** 年齡係數：表外取兩端，表內線性內插。日後歷練系統可共用。 */
export function youthRatioAt(age: number, table: readonly YouthAgeRatio[] = activeConfig.ageRatios): number {
    const rows = [...table].sort((a, b) => a.age - b.age);
    if (rows.length === 0) return 1;
    if (age <= rows[0].age) return rows[0].ratio;
    const last = rows[rows.length - 1];
    if (age >= last.age) return last.ratio;
    for (let i = 1; i < rows.length; i++) {
        if (age <= rows[i].age) {
            const a = rows[i - 1];
            const b = rows[i];
            return a.ratio + (b.ratio - a.ratio) * ((age - a.age) / (b.age - a.age));
        }
    }
    return last.ratio;
}

const GRADES: readonly AptitudeGrade[] = ['D', 'C', 'B', 'A', 'S'];
const STAT_KEYS = ['str', 'int', 'lea', 'pol', 'cha'] as const;
const APTITUDE_FIELDS = ['troopAptitude', 'terrainAptitude', 'weatherAptitude'] as const;

function dropGrades(map: Readonly<Record<string, string>> | undefined, steps: number): Record<string, string> | undefined {
    if (!map) return undefined;
    const out: Record<string, string> = {};
    for (const [key, grade] of Object.entries(map)) {
        const rank = GRADES.indexOf(grade as AptitudeGrade);
        out[key] = rank < 0 ? grade : GRADES[Math.max(0, rank - steps)];
    }
    return out;
}

function scale(value: number | undefined, ratio: number): number | undefined {
    return typeof value === 'number' ? Math.max(1, Math.round(value * ratio)) : value;
}

function statOf(general: GeneralConfig, key: typeof STAT_KEYS[number] | 'luk'): number | undefined {
    const direct = general[key];
    if (typeof direct === 'number') return direct;
    const nested = general.stats?.[key];
    return typeof nested === 'number' ? nested : undefined;
}

/** 是否為尚未結業的少年版 */
export function isYouthGeneral(general: GeneralConfig | undefined | null): boolean {
    return !!(general as YouthGeneral | undefined | null)?.youth;
}

/** 轉蛋／入冊去重：少年版與成年版（同 id 或同 templateId）視為同一人。 */
export function isSameGeneralPerson(a: Pick<GeneralConfig, 'id' | 'templateId'>, b: Pick<GeneralConfig, 'id' | 'templateId'>): boolean {
    if (a.id === b.id) return true;
    return !!a.templateId && a.templateId === b.templateId;
}

/** 少年版目前是否已滿可入學年齡 */
export function youthCanEnroll(general: GeneralConfig): boolean {
    const mark = (general as YouthGeneral).youth;
    return !!mark && (general.age ?? 0) >= mark.enrollAge;
}

/** 從成年版史實資料推出 14 歲少年版（深複製；不改輸入）。 */
export function buildStarterYouth(adult: GeneralConfig, config: StarterYouthConfig = activeConfig): YouthGeneral {
    const ratio = youthRatioAt(config.age, config.ageRatios);
    const copy = JSON.parse(JSON.stringify(adult)) as YouthGeneral;
    const stats: Record<string, number> = { ...(copy.stats ?? {}) } as Record<string, number>;
    for (const key of STAT_KEYS) {
        const value = scale(statOf(adult, key), ratio);
        if (value === undefined) continue;
        (copy as unknown as Record<string, number>)[key] = value;
        stats[key] = value;
    }
    const luk = scale(statOf(adult, 'luk'), config.lukRatio);
    if (luk !== undefined) {
        copy.luk = luk;
        stats.luk = luk;
    }
    copy.stats = stats as unknown as GeneralStatsConfig;
    const hp = scale(adult.hp, config.hpRatio);
    if (hp !== undefined) {
        copy.hp = hp;
        copy.currentHp = hp;
    }
    const ep = scale(adult.ep, config.epRatio);
    if (ep !== undefined) copy.ep = ep;
    for (const field of APTITUDE_FIELDS) {
        const dropped = dropGrades(adult[field] as Record<string, string> | undefined, config.aptitudeGradeDrop);
        if (dropped) (copy as unknown as Record<string, unknown>)[field] = dropped;
    }
    copy.age = config.age;
    copy.youth = { enrollAge: config.enrollAge, adultAge: typeof adult.age === 'number' ? adult.age : config.enrollAge };
    return copy;
}

/**
 * 學府結業：少年版還原成年完整值，再疊上這趟培育的增量（結業後數值 - 結業前少年值）。
 * 名冊上的成長（轉數、戰法、奧義、因子…）沿用結業後的資料，只換數值、年齡、適性與標記。
 */
export function promoteYouthToAdult(graduated: GeneralConfig, before: GeneralConfig, adult: GeneralConfig): GeneralConfig {
    const mark = (before as YouthGeneral).youth ?? (graduated as YouthGeneral).youth;
    const next = { ...graduated } as YouthGeneral;
    delete next.youth;
    const stats: Record<string, number> = { ...(graduated.stats ?? {}) } as Record<string, number>;
    for (const key of [...STAT_KEYS, 'luk'] as const) {
        const full = statOf(adult, key);
        if (typeof full !== 'number') continue;
        const gain = Math.max(0, (statOf(graduated, key) ?? 0) - (statOf(before, key) ?? 0));
        (next as unknown as Record<string, number>)[key] = full + gain;
        stats[key] = full + gain;
    }
    next.stats = stats as unknown as GeneralStatsConfig;
    if (typeof adult.hp === 'number') {
        next.hp = adult.hp;
        next.currentHp = adult.hp;
    }
    if (typeof adult.ep === 'number') next.ep = Math.max(adult.ep, graduated.ep ?? 0);
    for (const field of APTITUDE_FIELDS) {
        if (adult[field]) (next as unknown as Record<string, unknown>)[field] = { ...(adult[field] as object) };
    }
    next.age = Math.max(graduated.age ?? 0, mark?.adultAge ?? adult.age ?? 0);
    return next;
}
