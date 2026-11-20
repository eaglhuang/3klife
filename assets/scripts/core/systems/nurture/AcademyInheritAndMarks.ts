// @spec-source → 學府培育三十六回合三階段推進與訓練效果公式規格書.md (doc_spec_1127)、PROG-2-9182 雙年先祖遺風開獎＋生平白因子印記
/**
 * AcademyInheritAndMarks — 學府雙年繼承開獎（第 12 / 24 回合）與結業生平白因子印記（純邏輯，不依賴 cc）。
 *
 * 數值與門檻對應 assets/resources/data/academy-inherit-marks.json：
 * 1. 雙年先祖遺風開獎：
 *    - P_inherit = clamp(0.15 + S_blue * 0.006 + (midtermMissed ? 0.10 : 0), 0.15, 0.65)
 *    - ΔStat = clamp(round(4 + S_blue * 0.35), 4, 28)
 *    - P_apt = R_pink >= 1 ? clamp(0.08 * R_pink, 0.08, 0.24) : 0（受常規 S 階上限約束）
 * 2. 結業生平白因子印記：
 *    - P_mark = min(1.0, baseByGrade(grade) + min(0.20, resonanceHits * 0.05))
 *    - 星等：C/B→1★、A→2★、S→3★；結構精簡僅存 { id, stars }。
 *    - 無限累積，但子代配種抽樣只取最高星前 2 枚；TP 折扣 5%/★（單印記上限 15%，合併總上限 60%）。
 */
import type { AcademyGrade } from './AcademyGraduation';
import type { AcademyId, AcademyStatKey, IDeterministicRng } from './AcademyTypes';

export interface CareerMarkRecord {
    id: string;
    stars: 1 | 2 | 3;
}

export interface AncestralInheritEventRecord {
    turn: 12 | 24;
    triggered: boolean;
    probability: number;
    targetStat: AcademyStatKey;
    statDelta: number;
    aptitudeBoostTarget?: string;
}

export interface AcademyInheritMarksConfig {
    doubleInheritance: {
        blueStarsCap: number;
        inheritProbBase: number;
        inheritProbPerStar: number;
        inheritProbMax: number;
        midtermFailRiteBonus: number;
        statDeltaBase: number;
        statDeltaPerStar: number;
        statDeltaMin: number;
        statDeltaMax: number;
        pinkAptProbPerStar: number;
        pinkAptProbMin: number;
        pinkAptProbMax: number;
        pinkMaxStars: number;
    };
    careerMarks: {
        gradeBaseProb: Record<AcademyGrade, number>;
        resonanceBonusPerHit: number;
        resonanceBonusMax: number;
        gradeStars: Record<AcademyGrade, 1 | 2 | 3>;
        tpDiscountPerStar: number;
        maxSingleMarkDiscount: number;
        maxTotalTpDiscount: number;
        maxBreedingSampleMarks: number;
        markIdByAcademy: Record<AcademyId, string>;
    };
}

export const ACADEMY_INHERIT_MARKS_JSON = 'data/academy-inherit-marks';

export const DEFAULT_ACADEMY_INHERIT_MARKS_CONFIG: Readonly<AcademyInheritMarksConfig> = {
    doubleInheritance: {
        blueStarsCap: 70,
        inheritProbBase: 0.15,
        inheritProbPerStar: 0.006,
        inheritProbMax: 0.65,
        midtermFailRiteBonus: 0.1,
        statDeltaBase: 4,
        statDeltaPerStar: 0.35,
        statDeltaMin: 4,
        statDeltaMax: 28,
        pinkAptProbPerStar: 0.08,
        pinkAptProbMin: 0.08,
        pinkAptProbMax: 0.24,
        pinkMaxStars: 3,
    },
    careerMarks: {
        gradeBaseProb: { C: 0.1, B: 0.25, A: 0.5, S: 0.8 },
        resonanceBonusPerHit: 0.05,
        resonanceBonusMax: 0.2,
        gradeStars: { C: 1, B: 1, A: 2, S: 3 },
        tpDiscountPerStar: 0.05,
        maxSingleMarkDiscount: 0.15,
        maxTotalTpDiscount: 0.6,
        maxBreedingSampleMarks: 2,
        markIdByAcademy: {
            ACAD_YINGCHUAN: 'mark_yingchuan_scholar',
            ACAD_YOUZHOU: 'mark_youzhou_cavalry',
            ACAD_JIANGDONG: 'mark_jiangdong_navy',
            ACAD_LUOYANG: 'mark_luoyang_court',
            ACAD_LONGZHONG: 'mark_longzhong_strategy',
        },
    },
};

let _config: AcademyInheritMarksConfig = DEFAULT_ACADEMY_INHERIT_MARKS_CONFIG;

export function getAcademyInheritMarksConfig(): AcademyInheritMarksConfig {
    return _config;
}

export function configureAcademyInheritMarks(raw: Partial<AcademyInheritMarksConfig> | null | undefined): void {
    if (!raw) return;
    _config = {
        doubleInheritance: { ...DEFAULT_ACADEMY_INHERIT_MARKS_CONFIG.doubleInheritance, ...(raw.doubleInheritance ?? {}) },
        careerMarks: {
            ...DEFAULT_ACADEMY_INHERIT_MARKS_CONFIG.careerMarks,
            ...(raw.careerMarks ?? {}),
            gradeBaseProb: { ...DEFAULT_ACADEMY_INHERIT_MARKS_CONFIG.careerMarks.gradeBaseProb, ...(raw.careerMarks?.gradeBaseProb ?? {}) },
            gradeStars: { ...DEFAULT_ACADEMY_INHERIT_MARKS_CONFIG.careerMarks.gradeStars, ...(raw.careerMarks?.gradeStars ?? {}) },
            markIdByAcademy: { ...DEFAULT_ACADEMY_INHERIT_MARKS_CONFIG.careerMarks.markIdByAcademy, ...(raw.careerMarks?.markIdByAcademy ?? {}) },
        },
    };
}

export function resetAcademyInheritMarks(): void {
    _config = DEFAULT_ACADEMY_INHERIT_MARKS_CONFIG;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function computeInheritProbability(
    weightedBlueStars: number,
    midtermMissedBonus = false,
    config: AcademyInheritMarksConfig = DEFAULT_ACADEMY_INHERIT_MARKS_CONFIG,
): number {
    const d = config.doubleInheritance;
    const stars = clamp(weightedBlueStars, 0, d.blueStarsCap);
    const raw = d.inheritProbBase + stars * d.inheritProbPerStar + (midtermMissedBonus ? d.midtermFailRiteBonus : 0);
    return Number(clamp(raw, d.inheritProbBase, d.inheritProbMax).toFixed(4));
}

export function computeInheritStatDelta(
    weightedBlueStars: number,
    config: AcademyInheritMarksConfig = DEFAULT_ACADEMY_INHERIT_MARKS_CONFIG,
): number {
    const d = config.doubleInheritance;
    const stars = clamp(weightedBlueStars, 0, d.blueStarsCap);
    return clamp(Math.round(d.statDeltaBase + stars * d.statDeltaPerStar), d.statDeltaMin, d.statDeltaMax);
}

export function computePinkAptitudeProbability(
    pinkStars: number,
    config: AcademyInheritMarksConfig = DEFAULT_ACADEMY_INHERIT_MARKS_CONFIG,
): number {
    const d = config.doubleInheritance;
    if (pinkStars < 1) return 0;
    const stars = clamp(pinkStars, 1, d.pinkMaxStars);
    return Number(clamp(d.pinkAptProbPerStar * stars, d.pinkAptProbMin, d.pinkAptProbMax).toFixed(4));
}

export function rollAncestralInheritEvent(
    input: {
        turn: 12 | 24;
        weightedBlueStars: number;
        targetStat: AcademyStatKey;
        midtermMissedBonus?: boolean;
        pinkStars?: number;
        pinkAptitudeTarget?: string;
    },
    rng: IDeterministicRng,
    config: AcademyInheritMarksConfig = DEFAULT_ACADEMY_INHERIT_MARKS_CONFIG,
): AncestralInheritEventRecord {
    const probability = computeInheritProbability(input.weightedBlueStars, !!input.midtermMissedBonus, config);
    const triggered = rng.chance(Math.round(probability * 10000), 10000, `ancestral-inherit-t${input.turn}`);
    if (!triggered) {
        return {
            turn: input.turn,
            triggered: false,
            probability,
            targetStat: input.targetStat,
            statDelta: 0,
        };
    }
    const statDelta = computeInheritStatDelta(input.weightedBlueStars, config);
    let aptitudeBoostTarget: string | undefined;
    const pinkProb = computePinkAptitudeProbability(input.pinkStars ?? 0, config);
    if (pinkProb > 0 && input.pinkAptitudeTarget) {
        if (rng.chance(Math.round(pinkProb * 10000), 10000, `ancestral-pink-t${input.turn}`)) {
            aptitudeBoostTarget = input.pinkAptitudeTarget;
        }
    }
    return {
        turn: input.turn,
        triggered: true,
        probability,
        targetStat: input.targetStat,
        statDelta,
        ...(aptitudeBoostTarget ? { aptitudeBoostTarget } : {}),
    };
}

export function computeCareerMarkProbability(
    grade: AcademyGrade,
    resonanceHits: number,
    config: AcademyInheritMarksConfig = DEFAULT_ACADEMY_INHERIT_MARKS_CONFIG,
): number {
    const cm = config.careerMarks;
    const base = cm.gradeBaseProb[grade] ?? cm.gradeBaseProb.C;
    const bonus = Math.min(cm.resonanceBonusMax, Math.max(0, resonanceHits) * cm.resonanceBonusPerHit);
    return Number(Math.min(1, base + bonus).toFixed(4));
}

export function rollGraduationCareerMark(
    input: {
        academyId: AcademyId;
        grade: AcademyGrade;
        resonanceHits: number;
    },
    rng: IDeterministicRng,
    config: AcademyInheritMarksConfig = DEFAULT_ACADEMY_INHERIT_MARKS_CONFIG,
): CareerMarkRecord | null {
    const prob = computeCareerMarkProbability(input.grade, input.resonanceHits, config);
    if (!rng.chance(Math.round(prob * 10000), 10000, 'graduation-career-mark')) {
        return null;
    }
    const cm = config.careerMarks;
    return {
        id: cm.markIdByAcademy[input.academyId] ?? `mark_${input.academyId.toLowerCase()}`,
        stars: cm.gradeStars[input.grade] ?? 1,
    };
}

/** 選擇題 2C：印記無限累積，但子代配種只取最高星前 N 枚（預設 2 枚）參與抽樣 */
export function topCareerMarksForBreeding(
    marks: readonly CareerMarkRecord[] | undefined,
    limit: number = DEFAULT_ACADEMY_INHERIT_MARKS_CONFIG.careerMarks.maxBreedingSampleMarks,
): CareerMarkRecord[] {
    if (!marks || marks.length === 0 || limit <= 0) return [];
    return [...marks]
        .sort((a, b) => b.stars - a.stars)
        .slice(0, limit);
}

/** 計算印記提供的戰法 TP 折扣（5%/★，單印記上限 15%，與綠因子合併總上限 60%） */
export function careerMarkTpDiscount(
    marks: readonly CareerMarkRecord[] | undefined,
    matchingMarkId: string,
    greenFactorDiscount = 0,
    config: AcademyInheritMarksConfig = _config,
): number {
    const cm = config.careerMarks;
    const matched = topCareerMarksForBreeding(marks, cm.maxBreedingSampleMarks).find((m) => m.id === matchingMarkId);
    const singleDiscount = matched
        ? Math.min(cm.maxSingleMarkDiscount, matched.stars * cm.tpDiscountPerStar)
        : 0;
    return Number(Math.min(cm.maxTotalTpDiscount, Math.max(0, greenFactorDiscount) + singleDiscount).toFixed(4));
}

const MARK_TAG_PATTERNS: ReadonlyArray<{ markId: string; keywords: readonly string[] }> = [
    { markId: 'mark_youzhou_cavalry', keywords: ['cavalry', '騎兵', '騎術', '突擊', 'mark_youzhou_cavalry'] },
    { markId: 'mark_jiangdong_navy', keywords: ['navy', 'water', '水戰', '水軍', '水師', 'mark_jiangdong_navy'] },
    { markId: 'mark_longzhong_strategy', keywords: ['strategy', 'tactic', '計謀', '奇策', '軍師', '火攻', 'mark_longzhong_strategy'] },
    { markId: 'mark_yingchuan_scholar', keywords: ['scholar', 'politics', '內政', '經學', '治國', 'mark_yingchuan_scholar'] },
    { markId: 'mark_luoyang_court', keywords: ['court', 'diplomacy', 'command', '朝政', '外交', '統率', 'mark_luoyang_court'] },
];

/** 依戰法標籤比對同流派的生平白因子印記 ID（沒有相符則回傳 null） */
export function matchingCareerMarkIdForTags(
    tags: readonly string[],
    marks?: readonly CareerMarkRecord[],
): string | null {
    if (!tags || tags.length === 0) return null;
    const normalized = tags.map((t) => t.toLowerCase());
    for (const entry of MARK_TAG_PATTERNS) {
        if (entry.keywords.some((kw) => normalized.some((t) => t.includes(kw.toLowerCase())))) {
            if (!marks || marks.some((m) => m.id === entry.markId)) {
                return entry.markId;
            }
        }
    }
    return null;
}

/**
 * 結合綠因子基礎折扣與同流派印記折扣計算學習戰法最終 TP 成本（總折扣上限 60%）。
 */
export function applyCareerMarkTpDiscountToCost(
    baseCost: number,
    marks: readonly CareerMarkRecord[] | undefined,
    tacticTags: readonly string[],
    hasGreenFactor: boolean,
    config: AcademyInheritMarksConfig = _config,
): { finalCost: number; totalDiscount: number; matchedMarkId: string | null } {
    const greenDiscount = hasGreenFactor ? 0.5 : 0;
    const matchedMarkId = matchingCareerMarkIdForTags(tacticTags, marks);
    const totalDiscount = matchedMarkId
        ? careerMarkTpDiscount(marks, matchedMarkId, greenDiscount, config)
        : Math.min(config.careerMarks.maxTotalTpDiscount, greenDiscount);
    const finalCost = baseCost <= 0 ? 0 : Math.max(1, Math.ceil(baseCost * (1 - totalDiscount)));
    return { finalCost, totalDiscount, matchedMarkId };
}

/**
 * 配種抽樣雙親生平白因子印記（只取父母各自最高星前 maxBreedingSampleMarks 枚參與抽樣）。
 * 為避免影響既有測試的亂數序列，父母皆無印記時不消耗 random()。
 */
export function inheritCareerMarks(
    fatherMarks: readonly CareerMarkRecord[] | undefined,
    motherMarks: readonly CareerMarkRecord[] | undefined,
    random: () => number,
    config: AcademyInheritMarksConfig = _config,
): CareerMarkRecord[] {
    const limit = config.careerMarks.maxBreedingSampleMarks;
    const pool = [
        ...topCareerMarksForBreeding(fatherMarks, limit),
        ...topCareerMarksForBreeding(motherMarks, limit),
    ];
    if (pool.length === 0) return [];
    const byId = new Map<string, CareerMarkRecord>();
    for (const mark of pool) {
        const prob = Math.min(0.6, Math.max(0.1, mark.stars * 0.15));
        if (random() < prob) {
            const existing = byId.get(mark.id);
            if (!existing || mark.stars > existing.stars) {
                byId.set(mark.id, { id: mark.id, stars: mark.stars });
            }
        }
    }
    return Array.from(byId.values());
}
