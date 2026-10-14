// @spec-source → 因子爆發系統.md §因子-戰法 TP 折扣、§戰場地形效果；FBR-05（PROG-2-0584）
/**
 * FactorTacticLinkage — 因子與戰法／地形的連動規則（純邏輯，不依賴 cc）
 *
 * 規則：
 *   - 綠色（戰法種子）：子嗣有與戰法類別相符的綠色因子時，學習該戰法的 TP 成本 ×0.5。
 *   - 粉色（適性）：水戰適性 → 水域格可執行「合攻」；大霧免疫 → 大霧天氣命中 100%；林地適性 → 林地格移動力 +1。
 *
 * 本檔只提供規則判斷；接線（學習戰法扣 TP、戰場單位讀取因子）待 NUR-10 與單位因子綁定完成。
 *
 * Unity 對照：像 ScriptableObject 的 Modifier 設定表，每個條件只回傳倍率或布林值，由呼叫端決定套在哪裡。
 */
import { TerrainType, Weather } from '../../shared/CommonEnums';

/** 綠色因子的戰法 TP 折扣倍率（規格：TP_cost = base_TP × 0.5） */
export const GREEN_FACTOR_TP_MULTIPLIER = 0.5;

/** 學習戰法的 TP 成本；有相符的綠色因子時減半，結果無條件進位（PM 裁定 ceil） */
export function learnTpCost(baseTp: number, hasMatchingGreenFactor: boolean): number {
    return Math.ceil(hasMatchingGreenFactor ? baseTp * GREEN_FACTOR_TP_MULTIPLIER : baseTp);
}

/** 水域格是否可執行「合攻」（需要水戰適性）；河流對應規格的「水域」 */
export function canNavalCombinedAttack(terrain: TerrainType, hasWaterAptitude: boolean): boolean {
    return hasWaterAptitude && terrain === TerrainType.River;
}

/** 大霧天氣的命中率：有大霧免疫時 100%，否則維持原命中率 */
export function hitRateInWeather(baseHitRate: number, weather: Weather, hasFogImmunity: boolean): number {
    return weather === Weather.Fog && hasFogImmunity ? 1 : baseHitRate;
}

/** 林地格的移動力加成：有林地適性時 +1，否則 0 */
export function forestMoveBonus(terrain: TerrainType, hasForestAptitude: boolean): number {
    return hasForestAptitude && terrain === TerrainType.Forest ? 1 : 0;
}
