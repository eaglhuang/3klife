// @spec-source → 結緣生育輔助道具與幼年環境功能規格書 (doc_spec_0315) §2~§5（BRD-13、FBR-09，PROG-2-1941）
/**
 * BreedingAuxItems — 結緣輔助道具的受孕結算與幼年環境秘卷（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 安胎藥：受孕率 ×1.5，上限 95%（倍率沿用 FertilityBoost）。
 * - 送子符：本次 100% 受孕，子嗣天命 EP 保底 60。
 * - 受孕失敗：道具照扣，返還 20% 精力作慰問。
 * - 幼年環境秘卷（0~5 歲注入 1 份，5 歲開獎兌現）：
 *   藏經閣 智力／政治 +10%、演武場 武力／統率 +10%、名門私塾 魅力 +15% 且入學起始羈絆 +10；
 *   各有 20% 機率讓對應型因子 +1 星（不跨色）。
 *
 * 補元散、安胎藥預載（armed）與求籤令既有實作在 GameSession / ItemUseFlow，本檔只補其餘結算。
 * 暫定：送子符與三種秘卷尚未登錄 ItemDef、取得途徑與 UI 接線另卡。
 * Unity 對照：像配種前的 modifier 管線 + 開獎時套用的 ScriptableObject 加成表。
 */
import { FERTILITY_CONCEPTION_MULTIPLIER } from './FertilityBoost';

export const ITEM_CHILD_CHARM = 'ITEM_CHARM';
export type ChildEnvironmentItem = 'ITEM_ENV_LIBRARY' | 'ITEM_ENV_ARENA' | 'ITEM_ENV_ACADEMY';

export const FERTILITY_RATE_CAP = 0.95;
export const CHILD_CHARM_EP_FLOOR = 60;
export const FAILED_CONCEPTION_VITALITY_REFUND_RATIO = 0.2;
export const ENV_FACTOR_STAR_UP_CHANCE = 0.2;

export type UnveilStatKey = 'str' | 'int' | 'lea' | 'pol' | 'cha';
/** 因子傾向：智力型、武藝型、人際型 */
export type FactorAptitude = 'intellect' | 'martial' | 'social';

export interface ChildEnvironmentDef {
    name: string;
    statBonusPct: Partial<Record<UnveilStatKey, number>>;
    factorAptitude: FactorAptitude;
    /** 入學書院起始羈絆加值 */
    academyBondBonus: number;
}

export const CHILD_ENVIRONMENTS: Readonly<Record<ChildEnvironmentItem, ChildEnvironmentDef>> = {
    ITEM_ENV_LIBRARY: { name: '藏經閣修業秘卷', statBonusPct: { int: 0.1, pol: 0.1 }, factorAptitude: 'intellect', academyBondBonus: 0 },
    ITEM_ENV_ARENA: { name: '演武場破陣圖', statBonusPct: { str: 0.1, lea: 0.1 }, factorAptitude: 'martial', academyBondBonus: 0 },
    ITEM_ENV_ACADEMY: { name: '名門私塾筆記', statBonusPct: { cha: 0.15 }, factorAptitude: 'social', academyBondBonus: 10 },
};

export interface BreedingItemResolution {
    finalConceptionRate: number;
    epFloorApplied: boolean;
}

/** 受孕率：送子符 → 100%；安胎藥 → ×1.5 封頂 95%（基礎已高於 95% 時不下修）。 */
export function resolveConceptionWithItems(baseRate: number, useFertilityDrug: boolean, useChildCharm: boolean): BreedingItemResolution {
    const base = Math.min(1, Math.max(0, Number.isFinite(baseRate) ? baseRate : 0));
    if (useChildCharm) return { finalConceptionRate: 1, epFloorApplied: true };
    if (!useFertilityDrug) return { finalConceptionRate: base, epFloorApplied: false };
    const boosted = Math.round(base * FERTILITY_CONCEPTION_MULTIPLIER * 1e6) / 1e6;
    return { finalConceptionRate: Math.max(base, Math.min(FERTILITY_RATE_CAP, boosted)), epFloorApplied: false };
}

/** 送子符保底：子嗣天命 EP 至少 60。 */
export function applyChildCharmEpFloor(ep: number, epFloorApplied: boolean): number {
    return epFloorApplied ? Math.max(CHILD_CHARM_EP_FLOOR, ep) : ep;
}

/** 受孕失敗返還的慰問精力（本次結緣消耗精力的 20%，無條件捨去）。 */
export function failedConceptionVitalityRefund(vitalitySpent: number): number {
    return Math.max(0, Math.floor(vitalitySpent * FAILED_CONCEPTION_VITALITY_REFUND_RATIO));
}

/** 5 歲開獎套用環境秘卷的屬性加成（四捨五入）。 */
export function applyEnvironmentStats<T extends Record<UnveilStatKey, number>>(stats: T, env: ChildEnvironmentItem | null): T {
    if (!env) return { ...stats };
    const next = { ...stats };
    for (const [key, pct] of Object.entries(CHILD_ENVIRONMENTS[env].statBonusPct) as [UnveilStatKey, number][]) {
        next[key] = Math.round(next[key] * (1 + pct)) as T[UnveilStatKey];
    }
    return next;
}

/** 環境秘卷的因子跳星：因子傾向相符且擲骰 < 20% 才 +1 星，封頂 maxStar（不跨色由呼叫端只傳同色因子）。 */
export function rollEnvironmentFactorStar(
    env: ChildEnvironmentItem | null, factorAptitude: FactorAptitude, star: number, maxStar: number, random: () => number,
): number {
    if (!env || CHILD_ENVIRONMENTS[env].factorAptitude !== factorAptitude || star >= maxStar) return star;
    const r = random();
    return Number.isFinite(r) && r < ENV_FACTOR_STAR_UP_CHANCE ? star + 1 : star;
}
