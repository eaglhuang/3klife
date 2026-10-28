// @spec-source → NPC人性化規格書 F-1（Utility AI 評分：eventWeight × personalityWeight × relationshipModifier × moodModifier × cooldownModifier）；PROG-2-1379（NPC-05）
/**
 * NpcUtilityAI — 離線互動候選的評分（純邏輯，不依賴 cc）。
 *
 * 本次只當排序依據：分數只決定候選的先後，不改登入窗的觸發條件，也不改日誌內容。
 * 各權重目前沒有企劃數值，預設全為 1，因此排序結果與未評分時相同；數值待企劃定版後填入 NPC_RELATION_WEIGHTS。
 *
 * Unity 對照：像 Utility AI 的 Score 函式，把各 Modifier 相乘後排出最高分的行為；
 * 這裡只把最高分那一群交給原本的亂數挑選，等同 Sort + 同分隨機。
 */
import type { DynamicRelationType } from './KinRelation';

export interface NpcActionScoreInput {
    /** 事件權重（正式事件來源）；離線互動沒有事件權重時為 1 */
    eventWeight: number;
    /** 性格權重（對應行為類型）；暫定，待企劃定數值 */
    personalityWeight: number;
    /** 關係修正；離線互動目前不讀好感，為 1 */
    relationshipModifier: number;
    /** 情緒修正；離線互動目前不讀情緒，為 1 */
    moodModifier: number;
    /** 冷卻修正；登入窗內已排過的組合不會進候選，為 1 */
    cooldownModifier: number;
}

/** 暫定：各關係類型的性格權重（離線互動的行為類型）；全為 1 時排序不改變結果。 */
export const NPC_RELATION_WEIGHTS: Readonly<Record<DynamicRelationType, number>> = {
    COMRADE: 1,
    DYNAMIC_SWORN: 1,
    SPOUSE: 1,
    PARENT_CHILD: 1,
};

/** F-1 的評分：各項相乘。 */
export function scoreNpcAction(input: NpcActionScoreInput): number {
    return input.eventWeight * input.personalityWeight * input.relationshipModifier * input.moodModifier * input.cooldownModifier;
}

/** 離線互動候選的分數：只帶性格權重，其餘修正為 1。 */
export function scoreOfflineRelation(type: DynamicRelationType, weights: Readonly<Record<DynamicRelationType, number>> = NPC_RELATION_WEIGHTS): number {
    return scoreNpcAction({
        eventWeight: 1,
        personalityWeight: weights[type],
        relationshipModifier: 1,
        moodModifier: 1,
        cooldownModifier: 1,
    });
}
