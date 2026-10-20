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

/**
 * 水戰適性：水域 S 級，或有 naval-combined-attack 因子效果，兩者取聯集（PROG-2-0787，協調者裁示）。
 * 規格：水域 S「可執行合攻」；既有的因子效果也保留。
 */
export function hasNavalAptitude(terrainGrade: string, hasNavalFactorEffect: boolean): boolean {
    return terrainGrade === 'S' || hasNavalFactorEffect;
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

/** 戰場效果的鍵（對應 factor-battle-effect-map.json 的 effects） */
export type FactorBattleEffect = 'naval-combined-attack' | 'forest-move-bonus' | 'fog-immunity';

/** 因子 → 戰場效果的對應表：效果鍵 → 會觸發該效果的基因 id 清單 */
export interface FactorBattleEffectMap {
    effects: Readonly<Record<string, readonly string[]>>;
}

/** 武將持有的基因（只需要 id；level 為 0 或未解鎖的不算） */
export interface HeldGene {
    id?: string;
    level?: number;
    isLocked?: boolean;
}

/** 依對應表找出持有的戰場效果；沒有對應到的效果不列出 */
export function factorBattleEffectsOf(genes: readonly HeldGene[], map: FactorBattleEffectMap): FactorBattleEffect[] {
    const held = new Set(genes.filter((gene) => !gene.isLocked && (gene.level ?? 1) > 0).map((gene) => gene.id ?? ''));
    const effects: FactorBattleEffect[] = [];
    for (const [effect, geneIds] of Object.entries(map.effects)) {
        if (geneIds.some((id) => held.has(id))) effects.push(effect as FactorBattleEffect);
    }
    return effects;
}

/** 水域合攻的追加傷害倍率（PM 暫定：相鄰友軍追加一次 50% 傷害，不觸發反擊） */
export const NAVAL_COMBINED_DAMAGE_RATIO = 0.5;

/** 四方向相鄰（同一條線前後或同一深度左右），斜角不算 */
export function isOrthogonallyAdjacent(lane: number, depth: number, otherLane: number, otherDepth: number): boolean {
    return Math.abs(lane - otherLane) + Math.abs(depth - otherDepth) === 1;
}

/** 部隊是否具有某項戰場效果（呼叫端傳入 factorBattleEffectsOf 的結果） */
export function hasBattleEffect(effects: readonly string[], effect: FactorBattleEffect): boolean {
    return effects.includes(effect);
}

/** 攻擊方在大霧天氣且有大霧免疫時，本次命中必中（略過擲骰） */
export function isFogHitGuaranteed(weather: Weather, effects: readonly string[]): boolean {
    return weather === Weather.Fog && hasBattleEffect(effects, 'fog-immunity');
}

/** 依戰場效果決定的林地移動力加成：格子為林地且持有 forest-move-bonus 時 +1 */
export function forestMoveBonusFor(terrain: TerrainType, effects: readonly string[]): number {
    return forestMoveBonus(terrain, hasBattleEffect(effects, 'forest-move-bonus'));
}

/** 綠色戰法種子基因 id：字典中 color 為 green 的基因（PM 裁定） */
export function greenTacticSeedGeneIds(dictionary: readonly { id: string; color: string }[]): Set<string> {
    return new Set(dictionary.filter((gene) => gene.color === 'green').map((gene) => gene.id));
}
