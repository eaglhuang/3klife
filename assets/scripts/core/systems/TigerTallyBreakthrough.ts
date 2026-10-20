// @spec-source → 兵種（虎符）系統.md §4★→5★ 虎符精華突破、突破成功率、品質封頂；TRP-11（PROG-2-0839）
/**
 * TigerTallyBreakthrough — 虎符 4★→5★ 精華突破（純邏輯，不依賴 cc）
 *
 * 規格：4★ 突破需金幣 3000 與虎符精華 50，成功率 80%；失敗不損失虎符，材料消耗 50%。
 * UR 虎符突破成功率 +10%；保底符可 100% 成功。
 * 只有 SSR / UR 的封頂到得了 5★，R / SR 不能突破。
 *
 * 暫定（規格缺，可逆）：
 * - 失敗扣材料的比例同時套用金幣與精華（規格只寫「材料」）。
 * - 保底符成功時仍扣完整材料，只消耗 1 張保底符。
 * - 規格的「5★ 突破 10000 金幣 / 200 精華 / 50%」與品質封頂 5★ 衝突，本檔不實作，待 PM 裁決。
 *
 * 亂數由呼叫端傳入 roll（0~1），本檔不擲骰，同樣輸入同樣結果。
 *
 * Unity 對照：像裝備強化面板，Confirm 時先檢查材料，再用外部傳入的隨機數決定成敗。
 */
import type { TigerTallyQuality } from '../models/TigerTallyCard';
import { QUALITY_STAR_CAP } from './TigerTallyStar';

export const TALLY_BREAKTHROUGH_4_TO_5 = Object.freeze({ gold: 3000, essence: 50, successRate: 0.8 });
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

export type TallyBreakthroughBlock = 'NOT_4_STAR' | 'CAP_REACHED' | 'NOT_ENOUGH_GOLD' | 'NOT_ENOUGH_ESSENCE';

export type TallyBreakthroughResult =
    | { ok: false; reason: TallyBreakthroughBlock }
    | { ok: true; success: boolean; star: number; goldSpent: number; essenceSpent: number; guaranteeTokensSpent: number };

/** 突破成功率：4★ 基礎 80%，UR 另加 10%，上限 100%。 */
export function breakthroughSuccessRate(quality: TigerTallyQuality): number {
    const bonus = quality === 'UR' ? UR_BREAKTHROUGH_BONUS : 0;
    return Math.min(1, TALLY_BREAKTHROUGH_4_TO_5.successRate + bonus);
}

/** 4★ → 5★ 突破。材料不足或品質封頂不足時不扣任何材料。 */
export function resolveTallyBreakthrough(input: TallyBreakthroughInput): TallyBreakthroughResult {
    if (input.star !== 4) return { ok: false, reason: 'NOT_4_STAR' };
    if (QUALITY_STAR_CAP[input.quality] < 5) return { ok: false, reason: 'CAP_REACHED' };
    if (input.gold < TALLY_BREAKTHROUGH_4_TO_5.gold) return { ok: false, reason: 'NOT_ENOUGH_GOLD' };
    if (input.essence < TALLY_BREAKTHROUGH_4_TO_5.essence) return { ok: false, reason: 'NOT_ENOUGH_ESSENCE' };

    const useGuarantee = input.guaranteeTokens > 0;
    const success = useGuarantee || input.roll < breakthroughSuccessRate(input.quality);
    if (success) {
        return {
            ok: true,
            success: true,
            star: 5,
            goldSpent: TALLY_BREAKTHROUGH_4_TO_5.gold,
            essenceSpent: TALLY_BREAKTHROUGH_4_TO_5.essence,
            guaranteeTokensSpent: useGuarantee ? 1 : 0,
        };
    }
    return {
        ok: true,
        success: false,
        star: 4,
        goldSpent: Math.floor(TALLY_BREAKTHROUGH_4_TO_5.gold * BREAKTHROUGH_FAIL_MATERIAL_RATIO),
        essenceSpent: Math.floor(TALLY_BREAKTHROUGH_4_TO_5.essence * BREAKTHROUGH_FAIL_MATERIAL_RATIO),
        guaranteeTokensSpent: 0,
    };
}
