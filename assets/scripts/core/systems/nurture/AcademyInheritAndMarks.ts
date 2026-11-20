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
    config: AcademyInheritMarksConfig = DEFAULT_ACADEMY_INHERIT_MARKS_CONFIG,
): number {
    const cm = config.careerMarks;
    const matched = topCareerMarksForBreeding(marks, cm.maxBreedingSampleMarks).find((m) => m.id === matchingMarkId);
    const singleDiscount = matched
        ? Math.min(cm.maxSingleMarkDiscount, matched.stars * cm.tpDiscountPerStar)
        : 0;
    return Number(Math.min(cm.maxTotalTpDiscount, Math.max(0, greenFactorDiscount) + singleDiscount).toFixed(4));
}
