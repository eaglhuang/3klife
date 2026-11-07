// @spec-source → AI武將強度系統.md（doc_data_0002）E 段 AI_TurnEndRecalculate；WBS AIS-13；PROG-2-2055
/**
 * AiTurnEndRecalculate — 季度結算時 AI 國家全軍強度重算（純邏輯，不依賴 cc）
 *
 * 五階段：
 *   1. 武將年齡 +0.25 歲並重判年齡分段。
 *   2. 虎符 1~3★ 依經驗自動升星（沿用 TigerTallyStar 門檻與品質上限）；4★ 起要消耗精華，不在此自動處理。
 *   3. 逐將以 evaluateAiPower 重算總戰力。
 *   4. 國家軍力指數 = 全體武將總戰力加總。
 *   5. 軍力指數低於各國平均 × 0.7 時，策略轉向防守。
 * 暫定：規格未給 AI_TALLY_EXP_PER_TURN，先沿用一場戰鬥基礎經驗 TALLY_BATTLE_EXP_BASE；
 * 虎符改配最適武將、章節／難度縮放、精力回復由既有系統負責，本模組不重做。
 */
import { evaluateAiPower, type AiGeneralStats, type AiTroopPower } from './AiPowerEvaluation';
import { aiAgeStageOf, type AiAgeStage } from './AiStatScaling';
import { BATTLE_GROWTH_STAR_LIMIT, QUALITY_STAR_CAP, TALLY_BATTLE_EXP_BASE, TALLY_STAR_EXP, type TallyStarState } from './TigerTallyStar';

export const AI_AGE_PER_SEASON = 0.25;
export const AI_TALLY_EXP_PER_TURN = TALLY_BATTLE_EXP_BASE;
/** 軍力指數低於各國平均的此比例即轉守勢 */
export const AI_DEFENSIVE_SHIFT_RATIO = 0.7;

export interface AiRecalcGeneral {
    uid: string;
    age: number;
    stats: AiGeneralStats;
    specialTroop: AiTroopPower | null;
    tacticTpCosts: readonly number[];
    reincarnation: number;
}

export interface AiRecalcNation {
    generals: readonly AiRecalcGeneral[];
    tallies: readonly TallyStarState[];
}

export interface AiRecalcResult {
    generals: AiRecalcGeneral[];
    agePhases: AiAgeStage[];
    tallies: TallyStarState[];
    powers: number[];
    militaryIndex: number;
}

/** 1~3★ 以每季經驗自動升星；已到 3★ 或品質上限則只累積經驗 */
export function aiTallyAutoStar(tally: TallyStarState): TallyStarState {
    const exp = tally.exp + AI_TALLY_EXP_PER_TURN;
    const cap = Math.min(BATTLE_GROWTH_STAR_LIMIT, QUALITY_STAR_CAP[tally.quality]);
    let star = tally.star;
    while (star < cap && TALLY_STAR_EXP[star + 1] !== undefined && exp >= TALLY_STAR_EXP[star + 1]) star += 1;
    return { ...tally, star, exp };
}

export function recalculateAiNation(nation: AiRecalcNation): AiRecalcResult {
    const generals = nation.generals.map((g) => ({ ...g, age: g.age + AI_AGE_PER_SEASON }));
    const agePhases = generals.map((g) => aiAgeStageOf(g.age));
    const tallies = nation.tallies.map(aiTallyAutoStar);
    const powers = generals.map((g, i) => evaluateAiPower({
        stats: g.stats,
        specialTroop: g.specialTroop,
        tacticTpCosts: g.tacticTpCosts,
        reincarnation: g.reincarnation,
        agePhase: agePhases[i],
    }));
    const militaryIndex = powers.reduce((sum, p) => sum + p, 0);
    return { generals, agePhases, tallies, powers, militaryIndex };
}

/** 第 5 階段：是否轉守勢（各國平均 ≤ 0 時不轉） */
export function shouldShiftDefensive(militaryIndex: number, averageMilitaryIndex: number): boolean {
    return averageMilitaryIndex > 0 && militaryIndex < averageMilitaryIndex * AI_DEFENSIVE_SHIFT_RATIO;
}
