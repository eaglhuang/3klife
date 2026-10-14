// @spec-source → 數值系統.md §F-4 總戰力與戰役勝敗快速預判（PROG-2-0212，粗估暫定）
/**
 * SortiePrediction — 出征編制畫面的戰前粗估勝率（純邏輯，不依賴 cc）
 *
 * 粗估條件（暫定）：兩邊都用步兵、平原、晴天，不接虎符與支援，年齡一律壯年。
 * 規格的年齡門檻與實際出征編制（兵種、虎符、地形天氣）在本模組沒有定義，之後另開卡接實際資料。
 *
 * Unity 對照：戰前 Odds 標籤。主將頭像旁一行百分比；資料不足時顯示提示，不顯示假數字。
 */
import type { GeneralConfig } from '../models/GeneralUnit';
import { agePhaseOf } from '../models/GeneralGrowth';
import { AptitudeProfile, troopGradeOf } from './BattleAptitude';
import { predictBattleOutcome, PredictionResult } from './BattlePowerPrediction';
import { buildRatingEnv } from './BattleModifiers';
import { calculateBattlePowerRating, RatingGeneral, RatingSupport, RatingTroop } from './BattlePowerRating';

/** 粗估用的步兵數值（暫定，與 F-5 兵種基礎無直接對照） */
export const SORTIE_PREDICT_TROOP: RatingTroop = { baseType: 'INFANTRY', attack: 40, defense: 20, move: 3, range: 1, isSpecial: false };
export const SORTIE_PREDICT_TERRAIN = 'plain';
export const SORTIE_PREDICT_WEATHER = 'clear';

const NO_SUPPORT: RatingSupport = { spiritCardPower: null, strategist: null, deputy: null, baseFoodCap: 0 };

type StatKey = 'str' | 'int' | 'lea' | 'luk' | 'cha' | 'pol';

function statOf(g: GeneralConfig, key: StatKey): number {
    const direct = (g as unknown as Record<string, unknown>)[key];
    if (typeof direct === 'number') return direct;
    const nested = (g.stats as unknown as Record<string, unknown> | undefined)?.[key];
    return typeof nested === 'number' ? nested : 0;
}

function ratingGeneralOf(g: GeneralConfig): RatingGeneral {
    const profile = g as unknown as AptitudeProfile;
    return {
        str: statOf(g, 'str'),
        int: statOf(g, 'int'),
        lea: statOf(g, 'lea'),
        luk: statOf(g, 'luk'),
        cha: statOf(g, 'cha'),
        pol: statOf(g, 'pol'),
        agePhase: typeof g.age === 'number' ? agePhaseOf(g.age) : 'Prime',
        troopAptitude: troopGradeOf(profile, SORTIE_PREDICT_TROOP.baseType),
        reincarnation: 0,
    };
}

/** 粗估的總戰力：同一組兵種、地形、天氣，只差主將本身的能力與適性 */
export function estimateSortiePower(g: GeneralConfig): number {
    const profile = g as unknown as AptitudeProfile;
    const env = buildRatingEnv(profile, SORTIE_PREDICT_TERRAIN, SORTIE_PREDICT_WEATHER);
    return calculateBattlePowerRating(ratingGeneralOf(g), SORTIE_PREDICT_TROOP, null, NO_SUPPORT, env);
}

export interface SortiePrediction {
    winRate: number;
    result: PredictionResult;
}

/** 攻方主將 vs 守方敵將的粗估勝率 */
export function predictSortieOutcome(attacker: GeneralConfig, enemy: GeneralConfig): SortiePrediction {
    return predictBattleOutcome(estimateSortiePower(attacker), estimateSortiePower(enemy));
}

/** 畫面文字：有敵將就給「攻方勝率 X%（標籤）· 粗估」，沒有就提示資料未載入 */
export function sortiePredictText(attacker: GeneralConfig, enemy: GeneralConfig | null): string {
    if (!enemy) return '敵將資料未載入，暫無預判';
    const p = predictSortieOutcome(attacker, enemy);
    return `攻方勝率 ${p.winRate}%（${p.result}）· 粗估`;
}
