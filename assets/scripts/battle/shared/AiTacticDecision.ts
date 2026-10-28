// @spec-source → AI武將強度系統.md (doc_data_0002) E-4「戰法使用決策」AI_UseTactic（PROG-2-1466）
/**
 * AiTacticDecision — 敵方戰法依 AI 智力分級（純邏輯，不依賴 cc）
 *
 * 規格偽碼：
 * - 低 IQ（LOW）：30% 機率用一招隨機戰法，其餘回合不用。
 * - 中 IQ（MEDIUM）：TP 夠就用最高傷害戰法。
 * - 高 IQ（HIGH 以上）：依場上情況選最優戰法（TacticAiRules 打分）。
 *
 * 暫定（可逆）：
 * - EXTREME、PERFECT 與 HIGH 同規則（與 AiUltimateDecision 一致）。
 * - 「TP 夠」沿用既有門檻（敵將 SP 滿才進到選技），這裡不再另算。
 * - 中 IQ 只比預估傷害；沒有可估傷害的戰法時回 null，呼叫端退回武將主技能。
 * - 未套難度表（iq 為 null）沿用高 IQ 打分，維持既有行為。
 *
 * Unity 對照：像 AI 的 Ability 決策節點，依難度 ScriptableObject 的 IQ 走不同分支。
 */
import type { AiIqLevel } from '../../core/systems/AiDifficultyTable';
import { pickTacticByAiRule, type TacticAiCandidate, type TacticAiSituation } from './TacticAiRules';

/** 規格：低 IQ 每回合用戰法的機率 */
export const AI_LOW_IQ_TACTIC_RATE = 0.3;

/** 本回合是否按兵不動（只有低 IQ 會）；抽到 ≥ 機率時不出手 */
export function aiHoldsTactic(iq: AiIqLevel | null, random: () => number): boolean {
    return iq === 'LOW' && random() >= AI_LOW_IQ_TACTIC_RATE;
}

/** 依 IQ 從已填數值的候選挑一招；沒有可選時回 null */
export function pickTacticByIq(
    iq: AiIqLevel | null,
    candidates: readonly TacticAiCandidate[],
    situation: TacticAiSituation,
    random: () => number,
): string | null {
    if (candidates.length === 0) return null;
    if (iq === 'LOW') {
        const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
        return candidates[index].tacticId;
    }
    if (iq === 'MEDIUM') {
        let best: string | null = null;
        let bestDamage = 0;
        for (const candidate of candidates) {
            const damage = candidate.estimatedDamage ?? 0;
            if (damage > bestDamage) {
                best = candidate.tacticId;
                bestDamage = damage;
            }
        }
        return best;
    }
    return pickTacticByAiRule(candidates, situation);
}
