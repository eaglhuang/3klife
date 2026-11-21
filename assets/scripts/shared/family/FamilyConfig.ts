// @spec-source → 家族子嗣與血統總規格書 (doc_spec_1241) 第 11 章建議 JSON 欄位表；PROG-2-9441
/**
 * FamilyConfig — family-config.json 的解析與檢查（零依賴純函式）。
 *
 * 與其他設定檔的「壞資料退回預設」不同：家族設定缺欄位或型別不對一律 fail-fast（丟 FamilyConfigError，列出全部問題），
 * 不套預設值——數值由企劃放 JSON，缺了就該在載入當下暴露，而不是默默用錯誤的數字跑下去。
 * 標「待使用者」的價格欄位必須存在，值可以是 null（尚未定案），使用端遇 null 要當成「不可購買」。
 * 哺乳互斥規則（nursingBlocks／nursingAllows）由 occupancy-matrix.json 管（PROG-2-9442），這裡不重複放，避免兩份來源。
 */
export const FAMILY_CONFIG_JSON = 'data/family-config';

export type SilverPrice = number | null;

export interface FamilyConfigV1 {
    /** 幕府等級 → 配偶上限（鍵為 '1'～'5'） */
    spouseCapByHallLevel: Record<string, number>;
    bondAffinityToMarry: number;
    allianceMinRelation: string;
    matchmakerPerYear: number;
    /** 待使用者（商業化）；null＝未定案 */
    matchmakerPrice: SilverPrice;
    generatedSpouseEp: [number, number];
    postpartumQuarters: number;
    /** 母乳方式哺乳到孩子幾歲止（doc_spec_1180 第 15.2 節；規格 3.4 節暫 5 歲） */
    breastfeedEndAge: number;
    /** 乳母每季費用（銀兩，家族貨幣；PM 11/21 授權企劃暫定，已由 wallet 銀兩幣別實扣（PROG-2-9591）） */
    wetNurseSilverPerQuarter: number;
    /** 新局家族銀兩（PROG-2-9591；PM 11/21 授權企劃暫定）：夠付一次媒人加幾季乳母，銀兩收入來源另案 */
    startingSilver: number;
    crowdThreshold: number;
    childrenTypicalRange: [number, number];
    geniusChance: number;
    geniusParentEpBonus: { one: number; both: number; cap: number };
    geniusPityEvery: number;
    noAcademyStatPct: number;
    /** 待使用者（商業化）；null＝未定案 */
    branchGrantSilver: SilverPrice;
    branchPrestige: number;
    branchStartLoyalty: number;
    marriageRelation: number;
    marriagePerNation: number;
    /** 與配偶母國開戰：配偶心情／忠誠調整量（裁決 Q-SP2：−30／−20；心情換算成心智事件價值，見 GameSession.adjustMood） */
    homeWarMoodDelta: number;
    homeWarLoyaltyDelta: number;
    adoptStoryMax: number;
    recruitAdoptPerYear: number;
    adopteeAgeRange: [number, number];
    /** 範本池由企劃另列（F6 填）；F1 只檢查是陣列 */
    adopteeTemplates: unknown[];
    /** 歷史名將義子名單（F6 填）；F1 只檢查是陣列 */
    historicalAdoptees: unknown[];
    fatherSonSynergyPct: number;
    retainerChildInheritPct: number;
    retainerChildEveryQuarters: number;
    loyaltyOnEnroll: number;
    loyaltyOnGraduate: Record<'S' | 'A' | 'B' | 'C', number>;
    loyaltyOnRefuseEnroll: number;
    leaveLoyalty: number;
    leaveChancePerQuarter: number;
    /** 加速道具獎池（企劃另列，F10 填）；F1 只檢查是陣列 */
    growthItemPool: unknown[];
}

export class FamilyConfigError extends Error {
    public readonly issues: string[];

    public constructor(issues: string[]) {
        super(`[FamilyConfig] family-config.json 不合格（${issues.length} 項）：${issues.join('；')}`);
        this.name = 'FamilyConfigError';
        this.issues = issues;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNum(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

/** 解析並檢查；任何缺欄位或型別／範圍不對都累積成一個 FamilyConfigError 丟出 */
export function parseFamilyConfig(raw: unknown): FamilyConfigV1 {
    const issues: string[] = [];
    if (!isRecord(raw)) throw new FamilyConfigError(['整份設定不是物件']);
    const src = raw;

    const num = (key: string, min = 0, max = Number.POSITIVE_INFINITY, integer = false): number => {
        const v = src[key];
        if (!isNum(v)) { issues.push(`${key} 缺少或不是數字`); return 0; }
        if (v < min || v > max || (integer && !Number.isInteger(v))) issues.push(`${key}=${v} 超出範圍（${min}～${max}${integer ? '，整數' : ''}）`);
        return v;
    };
    const int = (key: string, min = 0): number => num(key, min, Number.POSITIVE_INFINITY, true);
    const price = (key: string): SilverPrice => {
        if (!(key in src)) { issues.push(`${key} 缺欄位（待使用者的價格也要寫 null）`); return null; }
        const v = src[key];
        if (v === null) return null;
        if (!isNum(v) || v < 0) { issues.push(`${key} 必須是 null 或非負數字`); return null; }
        return v;
    };
    const pair = (key: string): [number, number] => {
        const v = src[key];
        if (!Array.isArray(v) || v.length !== 2 || !isNum(v[0]) || !isNum(v[1]) || v[0] > v[1]) {
            issues.push(`${key} 必須是 [最小, 最大] 兩個數字且最小不大於最大`);
            return [0, 0];
        }
        return [v[0], v[1]];
    };
    const list = (key: string): unknown[] => {
        const v = src[key];
        if (!Array.isArray(v)) { issues.push(`${key} 缺少或不是陣列`); return []; }
        return v;
    };
    const str = (key: string): string => {
        const v = src[key];
        if (typeof v !== 'string' || v === '') { issues.push(`${key} 缺少或不是非空字串`); return ''; }
        return v;
    };
    const record = (key: string): Record<string, unknown> => {
        const v = src[key];
        if (!isRecord(v)) { issues.push(`${key} 缺少或不是物件`); return {}; }
        return v;
    };

    const spouseCapByHallLevel: Record<string, number> = {};
    const capSrc = record('spouseCapByHallLevel');
    for (const level of ['1', '2', '3', '4', '5']) {
        const v = capSrc[level];
        if (!isNum(v) || !Number.isInteger(v) || v < 0) issues.push(`spouseCapByHallLevel.${level} 缺少或不是非負整數`);
        else spouseCapByHallLevel[level] = v;
    }

    const bonusSrc = record('geniusParentEpBonus');
    const bonus = (field: 'one' | 'both' | 'cap'): number => {
        const v = bonusSrc[field];
        if (!isNum(v) || v < 0) { issues.push(`geniusParentEpBonus.${field} 缺少或不是非負數字`); return 0; }
        return v;
    };
    const graduateSrc = record('loyaltyOnGraduate');
    const graduate = (grade: 'S' | 'A' | 'B' | 'C'): number => {
        const v = graduateSrc[grade];
        if (!isNum(v)) { issues.push(`loyaltyOnGraduate.${grade} 缺少或不是數字`); return 0; }
        return v;
    };

    const config: FamilyConfigV1 = {
        spouseCapByHallLevel,
        bondAffinityToMarry: num('bondAffinityToMarry', 0, 100),
        allianceMinRelation: str('allianceMinRelation'),
        matchmakerPerYear: int('matchmakerPerYear'),
        matchmakerPrice: price('matchmakerPrice'),
        generatedSpouseEp: pair('generatedSpouseEp'),
        postpartumQuarters: int('postpartumQuarters'),
        breastfeedEndAge: int('breastfeedEndAge', 1),
        wetNurseSilverPerQuarter: int('wetNurseSilverPerQuarter'),
        startingSilver: int('startingSilver'),
        crowdThreshold: int('crowdThreshold', 1),
        childrenTypicalRange: pair('childrenTypicalRange'),
        geniusChance: num('geniusChance', 0, 1),
        geniusParentEpBonus: { one: bonus('one'), both: bonus('both'), cap: bonus('cap') },
        geniusPityEvery: int('geniusPityEvery', 1),
        noAcademyStatPct: num('noAcademyStatPct', 0, 2),
        branchGrantSilver: price('branchGrantSilver'),
        branchPrestige: num('branchPrestige'),
        branchStartLoyalty: num('branchStartLoyalty', 0, 100),
        marriageRelation: num('marriageRelation'),
        marriagePerNation: int('marriagePerNation'),
        homeWarMoodDelta: num('homeWarMoodDelta', -100, 0),
        homeWarLoyaltyDelta: num('homeWarLoyaltyDelta', -100, 0),
        adoptStoryMax: int('adoptStoryMax'),
        recruitAdoptPerYear: int('recruitAdoptPerYear'),
        adopteeAgeRange: pair('adopteeAgeRange'),
        adopteeTemplates: list('adopteeTemplates'),
        historicalAdoptees: list('historicalAdoptees'),
        fatherSonSynergyPct: num('fatherSonSynergyPct'),
        retainerChildInheritPct: num('retainerChildInheritPct', 0, 1),
        retainerChildEveryQuarters: int('retainerChildEveryQuarters', 1),
        loyaltyOnEnroll: num('loyaltyOnEnroll'),
        loyaltyOnGraduate: { S: graduate('S'), A: graduate('A'), B: graduate('B'), C: graduate('C') },
        loyaltyOnRefuseEnroll: num('loyaltyOnRefuseEnroll', Number.NEGATIVE_INFINITY, 0),
        leaveLoyalty: num('leaveLoyalty', 0, 100),
        leaveChancePerQuarter: num('leaveChancePerQuarter', 0, 1),
        growthItemPool: list('growthItemPool'),
    };

    if (issues.length > 0) throw new FamilyConfigError(issues);
    return config;
}

/** 幕府等級對應的配偶上限；等級超出 1～5 取最近一級（設定已檢查過五級都有值） */
export function spouseCapFor(config: FamilyConfigV1, hallLevel: number): number {
    const level = Math.min(5, Math.max(1, Math.floor(hallLevel)));
    return config.spouseCapByHallLevel[String(level)];
}
