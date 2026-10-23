// @spec-source → 兵種（虎符）系統.md §4★→5★ 虎符精華突破、突破成功率、品質封頂；TRP-11（PROG-2-0839）；數值系統 F-5 突破表（PROG-2-0931 修正）
/**
 * TigerTallyBreakthrough — 虎符精華突破：3★→4★、4★→5★（純邏輯，不依賴 cc）
 *
 * 成本與成功率以「目標星級」為鍵（PM 裁定 2026-10-21，依數值系統 F-5）：
 *   - 3★→4★：金幣 3000、精華 50、成功率 80%
 *   - 4★→5★：金幣 10000、精華 200、成功率 50%
 * UR 虎符突破成功率 +10%；保底符可 100% 成功。
 * 品質封頂：R 3★、SR 4★、SSR／UR 5★，目標星級超過封頂時不能突破。
 *
 * 暫定（規格缺，可逆）：
 * - 失敗扣材料的比例同時套用金幣與精華（規格只寫「材料」）。
 * - 保底符成功時仍扣完整材料，只消耗 1 張保底符。
 *
 * 亂數由呼叫端傳入 roll（0~1），本檔不擲骰，同樣輸入同樣結果。
 *
 * Unity 對照：像裝備強化面板，Confirm 時先檢查材料與等級上限，再用外部傳入的隨機數決定成敗。
 */
import type { TigerTallyQuality } from '../models/TigerTallyCard';
import { QUALITY_STAR_CAP } from './TigerTallyStar';

export interface TallyBreakthroughCost {
    gold: number;
    essence: number;
    successRate: number;
}

/** 突破表以目標星級為鍵 */
export const TALLY_BREAKTHROUGH_TABLE: Readonly<Record<4 | 5, TallyBreakthroughCost>> = Object.freeze({
    4: Object.freeze({ gold: 3000, essence: 50, successRate: 0.8 }),
    5: Object.freeze({ gold: 10000, essence: 200, successRate: 0.5 }),
});
export const UR_BREAKTHROUGH_BONUS = 0.1;
export const BREAKTHROUGH_FAIL_MATERIAL_RATIO = 0.5;

export interface TallyBreakthroughInput {
    quality: TigerTallyQuality;
    star: number;
    gold: number;
    essence: number;
    guaranteeTokens: number;
    /** 0~1 的隨機數；小於成功率即成功 */
    roll: number;
}

export type TallyBreakthroughBlock = 'NOT_BREAKTHROUGH_STAR' | 'CAP_REACHED' | 'NOT_ENOUGH_GOLD' | 'NOT_ENOUGH_ESSENCE';

export type TallyBreakthroughResult =
    | { ok: false; reason: TallyBreakthroughBlock }
    | { ok: true; success: boolean; star: number; goldSpent: number; essenceSpent: number; guaranteeTokensSpent: number };

/** 可突破的目標星級：3★→4★、4★→5★；其他星級回傳 null */
export function breakthroughTargetStar(star: number): 4 | 5 | null {
    if (star === 3) return 4;
    if (star === 4) return 5;
    return null;
}

/** 突破成功率：依目標星級的基礎率，UR 另加 10%，上限 100%。 */
export function breakthroughSuccessRate(quality: TigerTallyQuality, targetStar: 4 | 5): number {
    const bonus = quality === 'UR' ? UR_BREAKTHROUGH_BONUS : 0;
    return Math.min(1, TALLY_BREAKTHROUGH_TABLE[targetStar].successRate + bonus);
}

/** 星級突破（3→4、4→5）。材料不足、品質封頂不足或星級不可突破時不扣任何材料。 */
export function resolveTallyBreakthrough(input: TallyBreakthroughInput): TallyBreakthroughResult {
    const targetStar = breakthroughTargetStar(input.star);
    if (targetStar === null) return { ok: false, reason: 'NOT_BREAKTHROUGH_STAR' };
    if (QUALITY_STAR_CAP[input.quality] < targetStar) return { ok: false, reason: 'CAP_REACHED' };

    const cost = TALLY_BREAKTHROUGH_TABLE[targetStar];
    if (input.gold < cost.gold) return { ok: false, reason: 'NOT_ENOUGH_GOLD' };
    if (input.essence < cost.essence) return { ok: false, reason: 'NOT_ENOUGH_ESSENCE' };

    const useGuarantee = input.guaranteeTokens > 0;
    const success = useGuarantee || input.roll < breakthroughSuccessRate(input.quality, targetStar);
    if (success) {
        return {
            ok: true,
            success: true,
            star: targetStar,
            goldSpent: cost.gold,
            essenceSpent: cost.essence,
            guaranteeTokensSpent: useGuarantee ? 1 : 0,
        };
    }
    return {
        ok: true,
        success: false,
        star: input.star,
        goldSpent: Math.floor(cost.gold * BREAKTHROUGH_FAIL_MATERIAL_RATIO),
        essenceSpent: Math.floor(cost.essence * BREAKTHROUGH_FAIL_MATERIAL_RATIO),
        guaranteeTokensSpent: 0,
    };
}
