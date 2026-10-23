// @spec-source → 戰法系統-shards/g5.md Step 6 AI 規則層；TacticAiRules.ts（PROG-2-0914 第 2 段純邏輯）
/**
 * EnemyTacticNumbers — 敵方戰法數值填入與選技（純邏輯，不依賴 cc）
 *
 * 把戰況數值填進 EnemyTacticCandidates 產生的候選，再交給 pickTacticByAiRule 選技。
 * 沒有數值的戰法保留空欄位，評分為 0，不會被誤選。
 *
 * Unity 對照：Action 清單先由 Blackboard 填上這一回合的數值，再由 Utility 選擇器打分。
 */
import { pickTacticByAiRule, type TacticAiCandidate, type TacticAiSituation } from './TacticAiRules';

export type TacticMetrics = Partial<Pick<
    TacticAiCandidate,
    'estimatedDamage' | 'effectValue' | 'hasChokePoint' | 'denseArea' | 'weatherCompatible'
>>;

/** 依 metrics[tacticId] 把數值填進候選；回傳新陣列，不改原物件 */
export function fillTacticNumbers(
    candidates: readonly TacticAiCandidate[],
    metrics: Readonly<Record<string, TacticMetrics | undefined>>,
): TacticAiCandidate[] {
    return candidates.map(candidate => ({ ...candidate, ...metrics[candidate.tacticId] }));
}

/** 先填數值，再依 AI 規則選出一招；沒有可選的戰法時回 null */
export function pickEnemyTactic(
    candidates: readonly TacticAiCandidate[],
    metrics: Readonly<Record<string, TacticMetrics | undefined>>,
    situation: TacticAiSituation,
): string | null {
    return pickTacticByAiRule(fillTacticNumbers(candidates, metrics), situation);
}
