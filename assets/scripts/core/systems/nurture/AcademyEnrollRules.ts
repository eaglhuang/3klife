/**
 * 學府入學資格規則（PROG-2-9189）。
 * 門檻數值來自 assets/resources/data/academy-enroll-rules.json，由 ServiceLoader 載入後呼叫 configureAcademyEnrollRules；
 * 載入失敗時退回下方內建預設。純邏輯，不依賴 cc。
 */
export interface AcademyEnrollRulesConfig {
    /** 最低入學年齡：5 歲抓周、15 歲及冠才能入學 */
    minEnrollAge: number;
    /** 達此年齡時提醒並推薦先祖教官（不阻擋入學） */
    ancestorRecommendAge: number;
    /** 潁川基礎教官插槽數 */
    mentorSlotsBase: number;
}

export const ACADEMY_ENROLL_RULES_JSON = 'data/academy-enroll-rules';

export const DEFAULT_ACADEMY_ENROLL_RULES: Readonly<AcademyEnrollRulesConfig> = {
    minEnrollAge: 15,
    ancestorRecommendAge: 15,
    mentorSlotsBase: 3,
};

let _config: AcademyEnrollRulesConfig = { ...DEFAULT_ACADEMY_ENROLL_RULES };

function posInt(v: unknown, fallback: number): number {
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : fallback;
}

/** 套用 JSON 設定；缺欄位或型別不對的欄位退回預設。 */
export function configureAcademyEnrollRules(raw: Partial<AcademyEnrollRulesConfig> | null | undefined): void {
    const src = raw ?? {};
    _config = {
        minEnrollAge: posInt(src.minEnrollAge, DEFAULT_ACADEMY_ENROLL_RULES.minEnrollAge),
        ancestorRecommendAge: posInt(src.ancestorRecommendAge, DEFAULT_ACADEMY_ENROLL_RULES.ancestorRecommendAge),
        mentorSlotsBase: posInt(src.mentorSlotsBase, DEFAULT_ACADEMY_ENROLL_RULES.mentorSlotsBase),
    };
}

export function academyEnrollRules(): Readonly<AcademyEnrollRulesConfig> {
    return _config;
}

export function resetAcademyEnrollRules(): void {
    _config = { ...DEFAULT_ACADEMY_ENROLL_RULES };
}

/** 年齡資格：已滿最低入學年齡回 ok；否則回還差幾年。 */
export function checkEnrollAge(age: number): { ok: boolean; yearsShort: number } {
    const min = _config.minEnrollAge;
    const short = Math.max(0, min - Math.floor(age));
    return { ok: short === 0, yearsShort: short };
}

/** 是否需要提醒並推薦先祖教官（只提醒，不阻擋）。 */
export function shouldRecommendAncestor(age: number): boolean {
    return age >= _config.ancestorRecommendAge;
}
