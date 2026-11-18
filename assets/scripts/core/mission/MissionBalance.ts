/**
 * MissionBalance — 通用任務核心的全部數值（PROG-2-9144）
 *
 * 規則：控制流程裡不寫死任何數字，一律從這裡（或日後的 mission-balance.json，由卡 B 提供，
 * 結構與本檔 MissionBalance 相同）取值。引擎中立：不 import 'cc'。
 */

export const MISSION_DIFFICULTIES = ['EASY', 'NORMAL', 'ELITE', 'ADVANCED', 'HELL'] as const;
export type MissionDifficulty = (typeof MISSION_DIFFICULTIES)[number];

export interface MissionDifficultyBalance {
    /** 該難度的需求戰力（成功率底值公式用，沿用舊規格 §7.2） */
    needPower: number;
    /** 缺省耗費（定義未寫 cost 時使用） */
    cost: { grain: number; troops: number; silver: number };
    energy: number;
}

export interface MissionBalance {
    /** 情報分層下界：vague 起「高中低」、clear 起「區間」、full 起「確切」 */
    intelBands: { vague: number; clear: number; full: number };
    /** 隱藏獎勵只在此情報度以上才顯示 */
    hiddenRevealIntel: number;
    recon: {
        /** 第 n 次再探的增量（使用者裁決 +35／+25／+15）；超過長度沿用最後一項 */
        steps: number[];
        /** 單靠再探的情報上限（使用者裁決 90） */
        cap: number;
        /** 斥候加成上限與換算 */
        scoutBonusMax: number;
        scoutStatKey: string;
        scoutStatBaseline: number;
        scoutStatPerPoint: number;
        scoutTags: string[];
        scoutTagBonus: number;
    };
    wait: {
        /** 等待情報增量（使用者裁決 +20～25，定義可覆寫） */
        /** 每任務只能等待一次（使用者裁決，由實例 waited 旗標保證） */
        delta: number;
        expireBonusSeasons: number;
        cap: number;
    };
    /** 情報對風險的全域曲線 */
    intelCurve: {
        /** 成功率 += (intel-50)/100 × slope */
        successSlope: number;
        /** 大失敗比例乘數：情報 0 時、情報 100 時（線性內插） */
        disasterFactorAtZero: number;
        disasterFactorAtFull: number;
    };
    fitness: {
        base: number;
        powerSlope: number;
        baseMin: number;
        baseMax: number;
        statBaseline: number;
        statPerPoint: number;
        statMin: number;
        statMax: number;
        tagStep: number;
        tagCap: number;
        /** executorAffinity（-1～1，日後由武將記憶／信心提供）換算上限 */
        affinityMax: number;
        volunteerBonus: number;
        finalMin: number;
        finalMax: number;
        finalMaxVolunteer: number;
    };
    penalty: {
        /** 只有這些成敗等級可能受傷／被俘（使用者裁決：大失敗才有） */
        harmTiers: string[];
        injuryMinSeasons: number;
        injuryMaxSeasons: number;
        /** 被俘只在此難度以上 */
        captureMinDifficulty: MissionDifficulty;
    };
    projection: {
        rateHigh: number;
        rateMid: number;
        /** 區間投影半寬（百分點）與取整刻度 */
        rangeHalfWidth: number;
        rangeStep: number;
        /** 低於此情報時定性文字可能被誤導；機率 = (1-intel/100) × decoyFactor */
        decoyMaxIntel: number;
        decoyFactor: number;
        /** 獎勵量級星等門檻（加權分數），長度 2 → 1～3 星 */
        rewardStarCuts: number[];
        /** 獎勵區間投影的相對寬度（±）與取整刻度 */
        rewardRangePct: number;
        rewardRangeStep: number;
        rewardWeights: Record<string, number>;
        /** 風險等級門檻（大失敗機率）：低於 low 為低、低於 mid 為中，否則高 */
        riskLow: number;
        riskMid: number;
    };
    difficulties: Record<MissionDifficulty, MissionDifficultyBalance>;
}

export const DEFAULT_MISSION_BALANCE: MissionBalance = {
    intelBands: { vague: 30, clear: 60, full: 90 },
    hiddenRevealIntel: 100,
    recon: {
        steps: [35, 25, 15], cap: 90,
        scoutBonusMax: 8, scoutStatKey: 'int', scoutStatBaseline: 60, scoutStatPerPoint: 0.2,
        scoutTags: ['scout', 'spy'], scoutTagBonus: 3,
    },
    wait: { delta: 22, expireBonusSeasons: 1, cap: 100 },
    intelCurve: { successSlope: 0.2, disasterFactorAtZero: 1.5, disasterFactorAtFull: 0.5 },
    fitness: {
        base: 0.5, powerSlope: 0.5, baseMin: 0.05, baseMax: 0.95,
        statBaseline: 70, statPerPoint: 0.003, statMin: -0.06, statMax: 0.09,
        tagStep: 0.04, tagCap: 0.08, affinityMax: 0.05,
        volunteerBonus: 0.5, finalMin: 0.05, finalMax: 0.95, finalMaxVolunteer: 1.0,
    },
    penalty: { harmTiers: ['disaster'], injuryMinSeasons: 1, injuryMaxSeasons: 2, captureMinDifficulty: 'ADVANCED' },
    projection: {
        rateHigh: 0.65, rateMid: 0.4, rangeHalfWidth: 10, rangeStep: 5,
        decoyMaxIntel: 50, decoyFactor: 1,
        rewardStarCuts: [150, 350], rewardRangePct: 0.2, rewardRangeStep: 5,
        rewardWeights: { grain: 1, silver: 1.5, troops: 1, generalExp: 1.5, officerExp: 1.5, fame: 5 },
        riskLow: 0.1, riskMid: 0.25,
    },
    difficulties: {
        EASY: { needPower: 100, cost: { grain: 40, troops: 50, silver: 30 }, energy: 10 },
        NORMAL: { needPower: 180, cost: { grain: 60, troops: 80, silver: 50 }, energy: 10 },
        ELITE: { needPower: 260, cost: { grain: 100, troops: 150, silver: 80 }, energy: 15 },
        ADVANCED: { needPower: 330, cost: { grain: 180, troops: 250, silver: 140 }, energy: 15 },
        HELL: { needPower: 400, cost: { grain: 300, troops: 400, silver: 220 }, energy: 20 },
    },
};

export function difficultyRank(d: MissionDifficulty): number {
    return MISSION_DIFFICULTIES.indexOf(d);
}

export function clampNumber(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v;
}
