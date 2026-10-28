// @spec-source → NPC人性化規格書 F-1 行為選擇：Utility AI；WBS NPC-05；PROG-2-1439
/**
 * NpcUtilityAi — 武將主動互動的行為選擇與限流（純邏輯，不依賴 cc）。
 *
 * - scoreNpcAction：eventWeight × personalityWeights[actionType] × relationshipModifier × moodModifier × cooldownModifier。
 *   權重表由呼叫端傳入（規格沒有給數字）；查不到該行為權重時分數為 0，不猜測補值。
 * - selectNpcAction：候選中取分數最高且大於 0 的一項；全部為 0 時回傳 null。
 * - NpcInteractionLimiter：同一武將在同一登入窗內只允許 1 則高權重互動（規格 F-1 第 3 點）。
 *
 * Unity 對照：像一個 Utility AI 的 Score 函式加上 cooldown 計時器；同一個角色在同一輪只能跳出一句台詞。
 */

/** 高權重門檻（暫定 0.5，規格未給數字；調整只改這裡） */
export const NPC_HIGH_WEIGHT_THRESHOLD = 0.5;

export interface NpcActionContext<A extends string = string> {
    actionType: A;
    eventWeight: number;
    relationshipModifier: number;
    moodModifier: number;
    cooldownModifier: number;
}

export interface NpcScoredAction<A extends string = string> {
    generalId: string;
    actionType: A;
    score: number;
}

/** 依五個因子相乘算出行為分數；權重表沒有該行為時回傳 0。 */
export function scoreNpcAction<A extends string>(context: NpcActionContext<A>, personalityWeights: Readonly<Partial<Record<A, number>>>): number {
    const personality = personalityWeights[context.actionType];
    if (personality === undefined) return 0;
    return context.eventWeight * personality * context.relationshipModifier * context.moodModifier * context.cooldownModifier;
}

/** 從候選中選分數最高的一項；分數相同取先出現的，全部為 0 或沒有候選回傳 null。 */
export function selectNpcAction<A extends string>(
    candidates: ReadonlyArray<{ generalId: string; context: NpcActionContext<A> }>,
    personalityWeights: Readonly<Partial<Record<A, number>>>,
): NpcScoredAction<A> | null {
    let best: NpcScoredAction<A> | null = null;
    for (const candidate of candidates) {
        const score = scoreNpcAction(candidate.context, personalityWeights);
        if (score <= 0) continue;
        if (best === null || score > best.score) {
            best = { generalId: candidate.generalId, actionType: candidate.context.actionType, score };
        }
    }
    return best;
}

/**
 * 登入窗限流：同一武將在同一登入窗內只允許 1 則高權重互動。
 * 低權重互動不計入也不受限；換登入窗就重新計算。
 */
export class NpcInteractionLimiter {
    private readonly _claimed = new Set<string>();

    constructor(private readonly _threshold: number = NPC_HIGH_WEIGHT_THRESHOLD) {}

    /** 嘗試登記一則互動；回傳 true 表示允許。 */
    tryClaim(windowId: string, generalId: string, score: number): boolean {
        if (score < this._threshold) return true;
        const key = `${windowId}#${generalId}`;
        if (this._claimed.has(key)) return false;
        this._claimed.add(key);
        return true;
    }
}
